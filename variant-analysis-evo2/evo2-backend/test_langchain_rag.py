"""
Test script for LangChain RAG Integration
Tests that the RAG engine can fetch clinical context using LangChain with NCBI/ClinVar/PubMed APIs
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set environment to use LangChain
os.environ["USE_LANGCHAIN_RAG"] = "true"


async def test_langchain_rag():
    """Test the LangChain RAG engine"""
    print("=" * 60)
    print("Testing LangChain RAG")
    print("=" * 60)
    
    # Import LangChain RAG
    try:
        from evo2.langchain_rag import LangChainRAG
        print("\n[Test 1] Initializing LangChain RAG...")
        
        # Initialize without API key (will use fallback mode)
        rag = LangChainRAG(llm_provider="gemini", api_key=os.environ.get("GOOGLE_API_KEY"))
        print(f"  ✓ LangChain RAG initialized")
        print(f"  - LLM Provider: {rag.llm_provider}")
        print(f"  - LLM Available: {rag.llm is not None}")
        
    except Exception as e:
        print(f"  ✗ Failed to initialize LangChain RAG: {e}")
        return False
    
    # Test BRAF (not in fallback, uses APIs)
    print("\n[Test 2] Testing BRAF gene (API-based)...")
    try:
        result = await rag.get_clinical_context("BRAF", prediction="LOF")
        if result.get("found"):
            print(f"  ✓ BRAF context found!")
            print(f"  - Sources: {result.get('sources', [])}")
            print(f"  - Summary preview: {result.get('summary', 'N/A')[:150]}...")
        else:
            print(f"  ✗ BRAF not found")
            return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False
    
    # Test EGFR
    print("\n[Test 3] Testing EGFR gene...")
    try:
        result = await rag.get_clinical_context("EGFR")
        if result.get("found"):
            print(f"  ✓ EGFR context found!")
            print(f"  - Sources: {result.get('sources', [])}")
        else:
            print(f"  ⚠ EGFR not found")
    except Exception as e:
        print(f"  ✗ Error: {e}")
    
    # Test fake gene
    print("\n[Test 4] Testing FAKEGENE123 (should fail gracefully)...")
    try:
        result = await rag.get_clinical_context("FAKEGENE123")
        if not result.get("found"):
            print(f"  ✓ Correctly returned 'not found' for fake gene")
        else:
            print(f"  ⚠ Unexpected: found context for fake gene")
    except Exception as e:
        print(f"  ✗ Error: {e}")
    
    return True


async def test_api_sources():
    """Test that all API sources work"""
    print("\n" + "=" * 60)
    print("Testing Individual API Sources")
    print("=" * 60)
    
    from evo2.api_clients import search_gene_id, get_gene_summary, get_clinvar_variants, get_pubmed_abstracts
    
    # Test NCBI Gene
    print("\n[API Test 1] NCBI Gene API...")
    gene_id = await search_gene_id("BRCA1")
    if gene_id:
        print(f"  ✓ Found gene ID: {gene_id}")
        summary = await get_gene_summary(gene_id)
        if summary:
            print(f"  ✓ Got gene summary: {summary.get('description', 'N/A')[:50]}...")
    else:
        print("  ✗ Failed")
    
    # Test ClinVar
    print("\n[API Test 2] ClinVar API...")
    variants = await get_clinvar_variants("BRCA1", limit=3)
    if variants:
        print(f"  ✓ Found {len(variants)} ClinVar variants")
        for v in variants[:2]:
            print(f"    - {v.get('title', 'Unknown')[:50]}: {v.get('classification', 'Unknown')}")
    else:
        print("  ⚠ No variants found")
    
    # Test PubMed
    print("\n[API Test 3] PubMed API...")
    articles = await get_pubmed_abstracts("BRCA1", limit=3)
    if articles:
        print(f"  ✓ Found {len(articles)} PubMed articles")
        for a in articles[:2]:
            print(f"    - {a.get('title', 'Unknown')[:50]}...")
    else:
        print("  ⚠ No articles found")
    
    return True


async def main():
    print("\n" + "=" * 60)
    print("LangChain RAG + API Integration Test Suite")
    print("=" * 60)
    
    # Check for API key
    api_key = os.environ.get("GOOGLE_API_KEY")
    if api_key:
        print(f"\n✓ GOOGLE_API_KEY found (LLM synthesis enabled)")
    else:
        print(f"\n⚠ GOOGLE_API_KEY not set (will use fallback mode without LLM)")
    
    # Test API sources
    api_ok = await test_api_sources()
    
    # Test LangChain RAG
    rag_ok = await test_langchain_rag()
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"  API Sources:    {'✓ PASSED' if api_ok else '✗ FAILED'}")
    print(f"  LangChain RAG:  {'✓ PASSED' if rag_ok else '✗ FAILED'}")
    print("=" * 60)
    
    return api_ok and rag_ok


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
