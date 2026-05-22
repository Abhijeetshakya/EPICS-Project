"""
================================================================================
🧬 GENOMIC ARBITER - PRODUCTION PIPELINE
================================================================================
A comprehensive genomic analysis system for clinical variant interpretation.

Features:
- Multi-source evidence synthesis (Ensembl, ClinVar, PubMed, Exa, Tavily)
- Intelligent conflict resolution (VUS vs FUNC discrepancies)
- Confidence scoring and clinical recommendations
- PDF report generation
- Support for multiple cancer types (Breast, Prostate, Li-Fraumeni)

Author: Priyanshu Yadav
Date: February 2026
================================================================================
"""

import os
import re
from typing import List, TypedDict, Optional, Annotated
from datetime import datetime
import operator

import requests
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain.tools import tool
from langchain_community.tools.pubmed.tool import PubmedQueryRun
from langchain_exa import ExaSearchRetriever
from langchain_community.tools.tavily_search import TavilySearchResults
from langgraph.graph import StateGraph, END, START

from fpdf import FPDF

# ============================================================================
# ENVIRONMENT SETUP
# ============================================================================

load_dotenv()

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")
os.environ["TAVILY_API_KEY"] = os.getenv("TAVILY_API_KEY")
os.environ["EXA_API_KEY"] = os.getenv("EXA_API_KEY")

# Initialize LLM
llm = ChatGroq(model="qwen/qwen3-32b", temperature=0)


# ============================================================================
# STATE DEFINITION
# ============================================================================

class GenomicArbiterState(TypedDict):
    """State schema for genomic analysis pipeline"""
    # Input fields
    gene_symbol: str
    variant_id: str
    evo2_prediction: str
    
    # Intermediate results
    physical_map: Optional[str]
    discovered_ids: Optional[str]
    clinvar_report: Optional[str]
    research_findings: Annotated[List[str], operator.add]
    
    # Final outputs
    final_audit_report: Optional[str]
    clinical_recommendations: Optional[str]
    confidence_score: Optional[float]


# ============================================================================
# GENOMIC TOOLS
# ============================================================================

@tool
def ensembl_gene_lookup(gene_symbol: str) -> str:
    """
    Fetches chromosome, start/end coordinates, and Ensembl ID for a human gene.
    Use this to verify exactly where a gene sits on the genome.
    """
    server = "https://rest.ensembl.org"
    ext = f"/lookup/symbol/homo_sapiens/{gene_symbol}?"
    
    try:
        r = requests.get(server + ext, headers={"Content-Type": "application/json"})
        if not r.ok:
            return f"Ensembl could not find data for {gene_symbol}."
        
        data = r.json()
        return (
            f"Gene: {gene_symbol}\n"
            f"Ensembl ID: {data['id']}\n"
            f"Location: Chromosome {data['seq_region_name']} "
            f"({data['start']}-{data['end']})\n"
            f"Strand: {'Forward' if data['strand'] == 1 else 'Reverse'}"
        )
    except Exception as e:
        return f"Ensembl Request Failed: {str(e)}"


@tool
def clinvar_lookup(gene_symbol: str) -> str:
    """Finds clinical significance and pathogenicity of variants for a gene."""
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        "db": "clinvar",
        "term": f"{gene_symbol}[gene]",
        "retmode": "json",
        "retmax": 5
    }
    
    resp = requests.get(base_url, params=params)
    data = resp.json()
    ids = data.get("esearchresult", {}).get("idlist", [])
    
    if not ids:
        return f"No ClinVar entries found for {gene_symbol}."
    
    return f"Found {len(ids)} recent ClinVar records for {gene_symbol}. Top IDs: {', '.join(ids)}"


@tool
def clinvar_details(id_list: str) -> str:
    """
    Fetches ClinVar details and FILTERS for Pathogenic/Likely Pathogenic variants.
    Useful for high-priority clinical reports.
    """
    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    params = {
        "db": "clinvar",
        "id": id_list,
        "retmode": "json"
    }
    
    resp = requests.get(base_url, params=params)
    data = resp.json()
    uids = data.get("result", {}).get("uids", [])
    
    reports = []
    target_pathogenicity = ["pathogenic", "likely pathogenic"]

    for uid in uids:
        item = data["result"][uid]
        title = item.get("title", f"Variation {uid}")
        
        # Check Germline (Inherited)
        germline = item.get("germline_classification", {})
        pathogenicity = germline.get("description", "Not Reported")
        condition = germline.get("trait_name", "Condition Not Listed")

        # Check Somatic (Oncogenicity/Clinical Impact) fallback
        if pathogenicity == "Not Reported":
            somatic = item.get("oncogenicity_classification", {})
            pathogenicity = somatic.get("description", "Not Reported")
            condition = somatic.get("trait_name", condition)

        # Apply filter
        if pathogenicity.lower() in target_pathogenicity:
            reports.append(
                f"🚨 HIGH PRIORITY: {title}\n"
                f"   - PATHOGENICITY: {pathogenicity}\n"
                f"   - CONDITION: {condition}\n"
                f"   - UID: {uid}"
            )

    if not reports:
        return "No Pathogenic or Likely Pathogenic variants found in this batch."

    return "\n\n".join(reports)


# Initialize research tools
pubmed_tool = PubmedQueryRun(max_results=5)

exa_retriever = ExaSearchRetriever(
    k=3,
    highlights=True,
    exa_api_key=os.getenv("EXA_API_KEY"),
    include_domains=["nature.com", "cell.com", "genome.gov"]
)

medical_genomic_tool = TavilySearchResults(
    max_results=5,
    search_depth="advanced",
    include_answer=True,
    include_raw_content=True,
    include_domains=[
        "ncbi.nlm.nih.gov",
        "nature.com",
        "genome.gov",
        "ensembl.org",
        "omim.org",
        "cell.com",
        "bioinformatics.org"
    ]
)


# ============================================================================
# PIPELINE NODES
# ============================================================================

def grounding_node(state: GenomicArbiterState):
    """Node 1: Physical grounding - Get chromosome coordinates"""
    print("[NODE 1] Grounding Physical Coordinates...")
    result = ensembl_gene_lookup.invoke(state["gene_symbol"])
    return {"physical_map": result}


def discovery_node(state: GenomicArbiterState):
    """Node 2: Discover ClinVar variant IDs"""
    print(f"[NODE 2] Discovering ClinVar IDs for {state['gene_symbol']}...")
    result = clinvar_lookup.invoke(state["gene_symbol"])
    return {"discovered_ids": result}


def clinical_audit_node(state: GenomicArbiterState):
    """Node 3: Audit clinical pathogenicity"""
    print(f"[NODE 3] Auditing Clinical Pathogenicity for {state['variant_id']}...")
    result = clinvar_details.invoke(state["variant_id"])
    return {"clinvar_report": result}


def conflict_resolution_node(state: GenomicArbiterState):
    """Node 4: Resolve VUS vs FUNC discrepancies with 2026 research"""
    print("[NODE 4] Discrepancy Detected. Querying 2026 Evidence...")
    query = f"{state['gene_symbol']} variant {state['variant_id']} functional impact 2026"
    
    # Parallel tool execution
    p_res = pubmed_tool.invoke(query)
    e_res = exa_retriever.invoke(query)
    t_res = medical_genomic_tool.invoke(query)
    
    findings = [f"PubMed: {p_res}", f"Exa 2026: {e_res}", f"Tavily Deep Search: {t_res}"]
    return {"research_findings": findings}


def router(state: GenomicArbiterState):
    """Router: Decide if conflict resolution is needed"""
    if "No Pathogenic" in state["clinvar_report"] and state["evo2_prediction"] == "FUNC":
        return "conflict_resolution"
    return "synthesis"


def synthesis_node(state: GenomicArbiterState):
    """Node 5: Synthesize final clinical report"""
    print("[NODE 5] Creating Final Clinical Report...")

    pruned_research = []
    for finding in state["research_findings"]:
        pruned_research.append(finding[:1000] + "..." if len(finding) > 1000 else finding)
    
    prompt = ChatPromptTemplate.from_template("""
        You are a Senior Genomic Bioinformatician. Synthesize a clinical report.
        
        ### CONTEXT:
        - Gene: {gene_symbol}
        - Physical Map: {physical_map}
        - ClinVar: {clinvar_report}
        - Evo2 Prediction: {evo2_prediction}
        - 2026 Evidence: {research_findings}
        
        ### TASK:
        Create a crisp Markdown report with these sections:
        1. Gene Overview
        2. Clinical Relevance (2026 findings)
        3. Conflicting Evidence (if any)
        4. Discrepancy Resolution: VUS vs FUNC
        5. Conclusion
        
        If there is a VUS vs FUNC discrepancy, explain how the 2026 research resolves it. 
        No emojis. Focus on evidence quality. Do not include <think> tags in your response.
    """)
    
    synthesis_chain = prompt | llm

    final_output = synthesis_chain.invoke({
        "gene_symbol": state["gene_symbol"],
        "physical_map": state["physical_map"][:400],
        "clinvar_report": state["clinvar_report"][:800],
        "evo2_prediction": state["evo2_prediction"],
        "research_findings": "\n\n".join(pruned_research)
    })
    
    # Remove <think> tags if present
    cleaned_content = final_output.content
    cleaned_content = re.sub(r'<think>.*?</think>', '', cleaned_content, flags=re.DOTALL)

    return {"final_audit_report": cleaned_content.strip()}


def clinical_actionability_node(state: GenomicArbiterState):
    """Node 6: Generate clinical recommendations and confidence score"""
    print("[NODE 6] Generating Clinical Recommendations...")
    
    # Calculate confidence score
    confidence = calculate_confidence(state)
    
    # Generate actionable recommendations
    prompt = ChatPromptTemplate.from_template("""
        You are a Clinical Genomics Consultant. Based on the genomic analysis, provide ACTIONABLE clinical recommendations.
        
        ### INPUT DATA:
        - Gene: {gene_symbol}
        - ClinVar Status: {clinvar_report}
        - Evo2 Prediction: {evo2_prediction}
        - 2026 Research: {research_summary}
        - Confidence Score: {confidence}/10
        
        ### TASK:
        Generate a structured Clinical Recommendations section with:
        
        1. **Testing Recommendations** (Who should be tested? When?)
        2. **Monitoring Protocols** (What biomarkers? How often?)
        3. **Therapeutic Implications** (Any treatment modifications?)
        4. **Patient Counseling Points** (What should patients know?)
        5. **Limitations & Contraindications** (What NOT to do based on evidence)
        
        Use bullet points. Be specific and evidence-based. No generic advice.
        Do not include <think> tags in your response.
    """)
    
    chain = prompt | llm
    
    # Summarize research findings
    research_summary = "\n".join([
        finding[:300] + "..." 
        for finding in state["research_findings"][:2]
    ])
    
    recommendations = chain.invoke({
        "gene_symbol": state["gene_symbol"],
        "clinvar_report": state["clinvar_report"][:400],
        "evo2_prediction": state["evo2_prediction"],
        "research_summary": research_summary,
        "confidence": confidence
    })
    
    # Remove <think> tags if present
    cleaned_content = recommendations.content
    cleaned_content = re.sub(r'<think>.*?</think>', '', cleaned_content, flags=re.DOTALL)
    
    return {
        "clinical_recommendations": cleaned_content.strip(),
        "confidence_score": confidence
    }


def calculate_confidence(state: GenomicArbiterState) -> float:
    """Calculate confidence score based on evidence quality"""
    score = 5.0  # Baseline
    
    # Factor 1: ClinVar pathogenicity (+3 points)
    if "🚨 HIGH PRIORITY" in state.get("clinvar_report", ""):
        score += 3.0
    elif "No Pathogenic" in state.get("clinvar_report", ""):
        score -= 1.0
    
    # Factor 2: Research depth (+2 points)
    if len(state.get("research_findings", [])) >= 3:
        score += 2.0
    
    # Factor 3: Evo2 functional prediction (+1 point)
    if state.get("evo2_prediction") == "FUNC":
        score += 1.0
    
    # Factor 4: Research quality indicators
    research_text = " ".join(state.get("research_findings", []))
    if "replication" in research_text.lower():
        score += 0.5
    if "mechanism" in research_text.lower():
        score += 0.5
    if any(term in research_text.lower() for term in ["P = ", "OR = ", "CI"]):
        score += 1.0
    
    return min(10.0, max(1.0, score))  # Clamp between 1-10


# ============================================================================
# PDF EXPORT UTILITY
# ============================================================================

def clean_text_for_pdf(text: str) -> str:
    """Remove or replace Unicode characters that FPDF can't handle"""
    replacements = {
        '\u2013': '-',
        '\u2014': '--',
        '\u2018': "'",
        '\u2019': "'",
        '\u201c': '"',
        '\u201d': '"',
        '\u2022': '*',
        '\u2026': '...',
        '\u00a0': ' ',
    }
    
    for unicode_char, ascii_char in replacements.items():
        text = text.replace(unicode_char, ascii_char)
    
    return text.encode('latin-1', errors='ignore').decode('latin-1')


def export_report(final_state: GenomicArbiterState) -> str:
    """Export genomic analysis report to PDF"""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    # Add title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 10, f"Genomic Analysis Report: {final_state['gene_symbol']}", ln=True, align='C')
    pdf.ln(5)
    
    # Add metadata
    pdf.set_font("Arial", size=10)
    pdf.cell(0, 6, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
    pdf.cell(0, 6, f"Confidence Score: {final_state.get('confidence_score', 'N/A')}/10", ln=True)
    pdf.ln(5)
    
    # Add audit report
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 8, "Clinical Audit Report", ln=True)
    pdf.set_font("Arial", size=12)
    
    audit_report = clean_text_for_pdf(final_state.get("final_audit_report", "No report available"))
    pdf.multi_cell(0, 5, audit_report)
    pdf.ln(5)
    
    # Add recommendations
    pdf.set_font("Arial", 'B', 14)
    pdf.cell(0, 8, "Clinical Recommendations", ln=True)
    pdf.set_font("Arial", size=12)
    
    recommendations = clean_text_for_pdf(final_state.get("clinical_recommendations", "No recommendations available"))
    pdf.multi_cell(0, 5, recommendations)
    
    # Save PDF
    filename = f"{final_state['gene_symbol']}_Clinical_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    pdf.output(filename)
    print(f"\n[OK] PDF Report saved: {filename}")
    return filename


# ============================================================================
# GRAPH COMPILATION
# ============================================================================

def build_genomic_arbiter_graph():
    """Build and compile the genomic analysis pipeline"""
    
    builder = StateGraph(GenomicArbiterState)

    # Add nodes
    builder.add_node("grounding_node", grounding_node)
    builder.add_node("discovery_node", discovery_node)
    builder.add_node("clinical_audit_node", clinical_audit_node)
    builder.add_node("conflict_resolution", conflict_resolution_node)
    builder.add_node("synthesis", synthesis_node)
    builder.add_node("clinical_actionability", clinical_actionability_node)

    # Add edges
    builder.add_edge(START, "grounding_node")
    builder.add_edge("grounding_node", "discovery_node")
    builder.add_edge("discovery_node", "clinical_audit_node")
    builder.add_conditional_edges("clinical_audit_node", router, {
        "conflict_resolution": "conflict_resolution",
        "synthesis": "synthesis"
    })
    builder.add_edge("conflict_resolution", "synthesis")
    builder.add_edge("synthesis", "clinical_actionability")
    builder.add_edge("clinical_actionability", END)

    return builder.compile()


# ============================================================================
# MAIN EXECUTION FUNCTION
# ============================================================================

def analyze_variant(gene_symbol: str, variant_id: str, evo2_prediction: str = "FUNC", export_pdf: bool = True):
    """
    Analyze a genomic variant through the complete pipeline.
    
    Args:
        gene_symbol: Gene name (e.g., "BRCA1", "TP53")
        variant_id: ClinVar variant ID
        evo2_prediction: Functional prediction (default: "FUNC")
        export_pdf: Whether to export PDF report (default: True)
    
    Returns:
        dict: Final state containing all analysis results
    """
    print(f"\nStarting Genomic Arbiter Pipeline for {gene_symbol}...\n")
    
    # Build graph
    graph = build_genomic_arbiter_graph()
    
    # Prepare input
    initial_input = {
        "gene_symbol": gene_symbol,
        "variant_id": variant_id,
        "evo2_prediction": evo2_prediction,
        "research_findings": []
    }
    
    # Execute pipeline
    final_state = graph.invoke(initial_input)
    
    # Print results
    print("\n" + "="*80)
    print("FINAL AUDIT REPORT")
    print("="*80)
    print(final_state.get("final_audit_report", ""))

    print("\n" + "="*80)
    print("CLINICAL RECOMMENDATIONS")
    print(f"Confidence Score: {final_state.get('confidence_score', 'N/A')}/10")
    print("="*80)
    print(final_state.get("clinical_recommendations", ""))

    print("\n" + "="*80)
    print("EXECUTION SUMMARY")
    print("="*80)
    print(f"Gene: {final_state['gene_symbol']}")
    print(f"Physical Location: {final_state['physical_map'].split(chr(10))[2]}")
    print(f"ClinVar IDs Found: {final_state['discovered_ids'].split(':')[1].strip()}")
    print(f"Confidence: {final_state.get('confidence_score', 'N/A')}/10")
    
    # Export PDF
    if export_pdf:
        export_report(final_state)
    
    return final_state


# ============================================================================
# COMPILED GRAPH (READY FOR IMPORT)
# ============================================================================

# This is what gets imported when you do: from final import graph
graph = build_genomic_arbiter_graph()


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    print("\n" + "="*40)
    print("GENOMIC ARBITER - PRODUCTION PIPELINE")
    print("="*40)
    
    # Example: Analyze BRCA1 variant
    result = analyze_variant(
        gene_symbol="BRCA1",
        variant_id="17610",
        evo2_prediction="FUNC"
    )
    
    print("\n[OK] Analysis Complete!")