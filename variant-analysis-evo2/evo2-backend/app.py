"""
FastAPI server for EVO2 variant analysis
Uses NVIDIA Hosted API for real EVO2 scoring (no local GPU required)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from typing import Optional, List
import os
import sys
import math

# Load .env file
from dotenv import load_dotenv
load_dotenv()

# Add evo2 package to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# LangGraph Pipeline
from evo2.langgraph_pipeline import graph as langgraph_pipeline, GenomicArbiterState

app = FastAPI(title="EVO2 Variant Analysis API", version="1.0.0")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── NVIDIA EVO2 API Config ─────────────────────────────────────────────────
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_EVO2_URL = "https://health.api.nvidia.com/v1/biology/arc/evo2-40b/generate"

# ASCII indices in EVO2's 512-token vocabulary for DNA bases
NUCLEOTIDE_TO_IDX = {"A": 65, "C": 67, "T": 84, "G": 71}

# Scoring mode
_use_nvidia_api = bool(NVIDIA_API_KEY)
_dev_mode = not _use_nvidia_api


# Request/Response models
class VariantRequest(BaseModel):
    variant_position: int
    alternative: str
    genome: str
    chromosome: str
    reference: Optional[str] = ""

class VariantAnalysisResponse(BaseModel):
    position: int
    reference: str
    alternative: str
    evo2_score: float
    delta_score: float
    classification: Optional[str] = None

class ClinicalContextRequest(BaseModel):
    gene_symbol: str
    variant_id: Optional[str] = None
    prediction: Optional[str] = None

class ClinicalContextResponse(BaseModel):
    found: bool
    gene: Optional[str] = None
    summary: str
    sources: List[str] = []
    recommendations: Optional[str] = None
    confidence_score: Optional[float] = None


# ─── NVIDIA EVO2 Scoring ────────────────────────────────────────────────────

def score_with_nvidia_api(context_seq: str) -> dict:
    """
    Call NVIDIA Hosted EVO2 API with a DNA context sequence.
    Returns logits for the NEXT token after the context.
    
    The API's /generate endpoint with enable_logits=True returns logits
    in [num_tokens, 512] format. We generate 1 token and read its logits
    to see what the model predicts at that position.
    """
    import requests
    
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "sequence": context_seq,
        "num_tokens": 1,
        "top_k": 1,
        "enable_logits": True,
        "temperature": 1.0,
    }
    
    print(f"[NVIDIA API] Sending request (context length: {len(context_seq)} bp)...")
    
    response = requests.post(NVIDIA_EVO2_URL, headers=headers, json=payload, timeout=120)
    
    if response.status_code != 200:
        error_detail = response.text[:500]
        raise Exception(f"NVIDIA API error {response.status_code}: {error_detail}")
    
    data = response.json()
    
    # Extract logits for the generated token
    # logits shape: [num_tokens, 512] — we requested 1 token
    logits = data.get("logits", [])
    if not logits or len(logits) == 0:
        raise Exception("No logits returned from NVIDIA API")
    
    # Get the logits for the first (only) generated token
    token_logits = logits[0]  # shape: [512]
    
    print(f"[NVIDIA API] Got logits (vocab size: {len(token_logits)}), elapsed: {data.get('elapsed_ms', '?')}ms")
    
    return token_logits


def compute_variant_score(context_before: str, ref_allele: str, alt_allele: str) -> tuple:
    """
    Compute EVO2 variant effect score using NVIDIA API.
    
    Method: Zero-shot variant effect prediction
    1. Feed DNA context (sequence before the variant position) to EVO2
    2. Get model's predicted logits for the next position
    3. Extract log-probabilities for reference and alternative alleles
    4. Delta score = log_prob(alt) - log_prob(ref)
    
    Negative delta = variant is less likely than reference = potentially damaging
    Positive delta = variant is more likely = likely benign
    """
    # Get logits from EVO2
    token_logits = score_with_nvidia_api(context_before)
    
    # Convert logits to log-probabilities using log-softmax over DNA bases only
    dna_logits = {
        base: token_logits[idx] 
        for base, idx in NUCLEOTIDE_TO_IDX.items()
    }
    
    # Log-softmax over DNA bases for numerical stability
    max_logit = max(dna_logits.values())
    log_sum_exp = max_logit + math.log(
        sum(math.exp(v - max_logit) for v in dna_logits.values())
    )
    
    log_probs = {
        base: logit - log_sum_exp 
        for base, logit in dna_logits.items()
    }
    
    ref_log_prob = log_probs.get(ref_allele.upper(), -10.0)
    alt_log_prob = log_probs.get(alt_allele.upper(), -10.0)
    
    # Delta score: negative means variant is less favored (potentially damaging)
    delta_score = alt_log_prob - ref_log_prob
    
    print(f"[SCORING] Ref({ref_allele}): {ref_log_prob:.4f}, Alt({alt_allele}): {alt_log_prob:.4f}, Delta: {delta_score:.4f}")
    
    return alt_log_prob, delta_score


# ─── Genome Sequence Fetching ───────────────────────────────────────────────

def get_genome_sequence(position: int, genome: str, chromosome: str, window_size: int = 8192) -> tuple:
    """Fetch genome sequence from UCSC API"""
    import requests
    
    half_window = window_size // 2
    start = max(0, position - 1 - half_window)
    end = position - 1 + half_window + 1

    api_url = f"https://api.genome.ucsc.edu/getData/sequence?genome={genome};chrom={chromosome};start={start};end={end}"
    
    try:
        response = requests.get(api_url, timeout=10)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"UCSC API error: {response.status_code}")
        
        genome_data = response.json()
        if "dna" not in genome_data:
            error = genome_data.get("error", "Unknown error")
            raise HTTPException(status_code=400, detail=f"UCSC API error: {error}")
        
        sequence = genome_data.get("dna", "").upper()
        return sequence, start
    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch genome sequence: {str(e)}")


# ─── API Endpoints ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Health check endpoint"""
    mode = "NVIDIA_API" if _use_nvidia_api else "DEV_MOCK"
    return {"status": "ok", "service": "EVO2 Variant Analysis API", "mode": mode}

@app.post("/analyze-variant", response_model=VariantAnalysisResponse)
async def analyze_variant(request: VariantRequest):
    """
    Analyze a single variant using EVO2 model via NVIDIA Hosted API.
    Falls back to mock scoring if NVIDIA_API_KEY is not configured.
    """
    try:
        # Fetch genome sequence
        window_seq, seq_start = get_genome_sequence(
            position=request.variant_position,
            genome=request.genome,
            chromosome=request.chromosome,
            window_size=8192
        )
        
        # Calculate relative position within fetched window
        relative_pos = request.variant_position - 1 - seq_start
        
        if relative_pos < 0 or relative_pos >= len(window_seq):
            raise HTTPException(
                status_code=400,
                detail=f"Variant position {request.variant_position} is outside the fetched window"
            )
        
        # Get reference allele
        reference = request.reference if request.reference and request.reference.strip() else window_seq[relative_pos]
        
        if _dev_mode:
            # ── Mock mode (no NVIDIA API key) ──
            import random
            random.seed(hash(f"{request.variant_position}{request.alternative}{reference}") % 2**32)
            
            nucleotide_pairs = f"{reference}{request.alternative}"
            if nucleotide_pairs in ["AT", "TA", "GC", "CG"]:
                delta_score = -0.3 - random.random() * 0.4
            else:
                delta_score = -0.1 + random.random() * 0.2
            
            evo2_score = 0.5 + delta_score
            classification = "LOF" if delta_score < -0.2 else "FUNC"
            
            return VariantAnalysisResponse(
                position=request.variant_position,
                reference=reference,
                alternative=request.alternative,
                evo2_score=float(evo2_score),
                delta_score=float(delta_score),
                classification=classification
            )
        else:
            # ── Real EVO2 scoring via NVIDIA Hosted API ──
            # Use DNA context before the variant position for next-token prediction
            # Limit context to 1024 bp for API efficiency (model still gives good predictions)
            context_length = min(1024, relative_pos)
            context_before = window_seq[relative_pos - context_length:relative_pos]
            
            if len(context_before) < 16:
                raise HTTPException(
                    status_code=400,
                    detail="Insufficient genomic context before variant position"
                )
            
            # Score: get log-prob for ref vs alt at the variant position
            evo2_score, delta_score = compute_variant_score(
                context_before=context_before,
                ref_allele=reference,
                alt_allele=request.alternative
            )
            
            # Classification based on delta score
            # Negative delta = variant is less likely = potentially damaging (LOF)
            classification = "LOF" if delta_score < -0.5 else "FUNC"
            
            return VariantAnalysisResponse(
                position=request.variant_position,
                reference=reference,
                alternative=request.alternative,
                evo2_score=float(evo2_score),
                delta_score=float(delta_score),
                classification=classification
            )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in analyze_variant: {str(e)}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@app.get("/models")
async def list_models():
    """List available EVO2 models"""
    return {
        "available_models": [
            "evo2-40b (NVIDIA Hosted API)",
        ],
        "current_model": "evo2-40b",
        "dev_mode": _dev_mode,
        "mode_note": "NVIDIA Hosted API - Real EVO2 scoring" if _use_nvidia_api else "DEV MODE - Mock scores (set NVIDIA_API_KEY to enable)",
        "nvidia_api_configured": _use_nvidia_api,
    }

@app.post("/analyze-clinical-context", response_model=ClinicalContextResponse)
async def analyze_clinical_context(request: ClinicalContextRequest):
    """
    Get clinical context using LangGraph Genomic Arbiter pipeline.
    Multi-source evidence synthesis: Ensembl, ClinVar, PubMed, Exa, Tavily.
    """
    try:
        print(f"\n[LangGraph] Starting analysis for {request.gene_symbol}...")
        
        evo2_prediction = "FUNC" if request.prediction == "LOF" else (request.prediction or "FUNC")
        
        initial_input = {
            "gene_symbol": request.gene_symbol,
            "variant_id": request.variant_id or "unknown",
            "evo2_prediction": evo2_prediction,
            "research_findings": []
        }
        
        final_state = await langgraph_pipeline.ainvoke(initial_input)
        
        sources = ["Ensembl", "ClinVar", "PubMed"]
        if final_state.get("research_findings"):
            if any("Exa" in str(f) for f in final_state["research_findings"]):
                sources.append("Exa")
            if any("Tavily" in str(f) for f in final_state["research_findings"]):
                sources.append("Tavily")
        
        return ClinicalContextResponse(
            found=True,
            gene=request.gene_symbol,
            summary=final_state.get("final_audit_report", "Analysis complete."),
            sources=sources,
            recommendations=final_state.get("clinical_recommendations"),
            confidence_score=final_state.get("confidence_score")
        )
    except Exception as e:
        import traceback
        print(f"LangGraph Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to analyze: {str(e)}")


# ─── Startup ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if _use_nvidia_api:
        print("=" * 60)
        print("  EVO2 Variant Analysis API")
        print(f"  Mode: NVIDIA Hosted API (evo2-40b)")
        print(f"  Endpoint: {NVIDIA_EVO2_URL}")
        print("=" * 60)
    else:
        print("=" * 60)
        print("  EVO2 Variant Analysis API")
        print("  Mode: DEVELOPMENT (mock scores)")
        print("  Set NVIDIA_API_KEY in .env to enable real scoring")
        print("=" * 60)
    
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
