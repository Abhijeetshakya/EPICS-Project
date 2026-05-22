"""
RAG Engine for Clinical Context Retrieval
Supports both LangChain-based RAG and direct API fallback.
"""

from typing import Dict, Optional, Any
import os

# Determine which RAG implementation to use
USE_LANGCHAIN = os.environ.get("USE_LANGCHAIN_RAG", "true").lower() == "true"


def get_rag_engine():
    """Get the appropriate RAG engine based on configuration"""
    if USE_LANGCHAIN:
        try:
            from .langchain_rag import get_langchain_rag
            return get_langchain_rag()
        except Exception as e:
            print(f"[RAG] Failed to load LangChain RAG: {e}. Falling back to simple API mode.")
    
    # Fallback to simple API-based RAG
    from .api_clients import get_gene_clinical_context_sync
    
    class SimpleRAG:
        """Simple RAG using direct API calls without LLM synthesis"""
        
        def get_clinical_context(self, gene_symbol: str, variant_id: Optional[str] = None, prediction: Optional[str] = None) -> Dict[str, Any]:
            from .api_clients import get_gene_clinical_context_sync
            result = get_gene_clinical_context_sync(gene_symbol, variant_id)
            
            if result.get("found"):
                summary_parts = []
                if result.get("gene_function"):
                    summary_parts.append(f"**Gene Function:** {result['gene_function']}")
                if result.get("summary"):
                    summary = result["summary"]
                    if len(summary) > 500:
                        summary = summary[:500] + "..."
                    summary_parts.append(f"**Summary:** {summary}")
                if result.get("clinical_implications"):
                    summary_parts.append(f"**Clinical Implications:** {result['clinical_implications']}")
                if result.get("pathogenic_variants"):
                    summary_parts.append(f"**Pathogenic Variants:** {len(result['pathogenic_variants'])} reported in ClinVar")
                
                return {
                    "found": True,
                    "gene": gene_symbol,
                    "summary": "\n\n".join(summary_parts),
                    "sources": result.get("sources", [])
                }
            
            return {
                "found": False,
                "message": f"No clinical context found for {gene_symbol}."
            }
    
    return SimpleRAG()


class RagEngine:
    """Unified RAG Engine that delegates to appropriate implementation"""
    
    def __init__(self):
        self._engine = None
    
    def _get_engine(self):
        if self._engine is None:
            self._engine = get_rag_engine()
        return self._engine
    
    def get_clinical_context(self, gene_symbol: str, variant_id: Optional[str] = None, prediction: Optional[str] = None) -> Dict[str, Any]:
        """Get clinical context - delegates to LangChain or simple API"""
        engine = self._get_engine()
        
        # Check if it's the LangChain version
        if hasattr(engine, 'get_clinical_context_sync'):
            return engine.get_clinical_context_sync(gene_symbol, variant_id, prediction)
        else:
            return engine.get_clinical_context(gene_symbol, variant_id, prediction)


# Singleton
_rag_engine = None

def get_rag_engine_singleton():
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RagEngine()
    return _rag_engine
