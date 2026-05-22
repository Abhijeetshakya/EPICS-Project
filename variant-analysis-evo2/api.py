from fastapi import FastAPI
from pydantic import BaseModel
from app import graph

app = FastAPI()

class UserAnalysisRequest(BaseModel):
    gene_symbol: str
    variant_id: str
    evo2_prediction: str = "FUNC"  # Defaulting to "FUNC" as in your analyze_variant function

@app.get("/")
def home():
    return {"status": "Genomic Arbiter API is Online", "test_docs": "/docs"}

# Inside api.py
@app.post("/analyze")
async def start_analysis(request: UserAnalysisRequest):
    # Prepare the input dictionary as expected by your graph
    initial_input = {
        "gene_symbol": request.gene_symbol,
        "variant_id": request.variant_id,
        "evo2_prediction": request.evo2_prediction,
        "research_findings": [] # Initializing the required Annotated list
    }
    
    # Execute the graph
    final_state = await graph.ainvoke(initial_input)
    
    # Return the final report to the user
    return {
        "report": final_state.get("final_audit_report"),
        "recommendations": final_state.get("clinical_recommendations"),
        "confidence_score": final_state.get("confidence_score")
    }    