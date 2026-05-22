"""
Test script for RAG API Integration
Tests that the RAG engine can fetch clinical context from external APIs
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from evo2.api_clients import get_gene_clinical_context, search_gene_id, get_gene_summary, get_clinvar_variants
from evo2.rag_engine import RagEngine


async def test_api_clients():
    """Test the API client functions directly"""
    print("=" * 60)
    print("Testing API Clients")
    print("=" * 60)
    
    # Test 1: Search for gene ID
    print("\n[Test 1] Searching for BRAF gene ID...")
    gene_id = await search_gene_id("BRAF")
    if gene_id:
        print(f"  ✓ Found BRAF gene ID: {gene_id}")
    else:
        print("  ✗ Failed to find BRAF gene ID")
        return False
    
    # Test 2: Get gene summary
    print("\n[Test 2] Getting BRAF gene summary...")
    summary = await get_gene_summary(gene_id)
    if summary and summary.get("description"):
        print(f"  ✓ Got gene summary:")
        print(f"    - Description: {summary.get('description', 'N/A')[:80]}...")
        print(f"    - Summary length: {len(summary.get('summary', ''))} chars")
    else:
        print("  ✗ Failed to get gene summary")
    
    # Test 3: Get ClinVar variants
    print("\n[Test 3] Getting BRAF ClinVar variants...")
    variants = await get_clinvar_variants("BRAF", limit=3)
    if variants:
        print(f"  ✓ Found {len(variants)} ClinVar variant(s):")
        for v in variants[:2]:
            print(f"    - {v.get('title', 'Unknown')}: {v.get('classification', 'Unknown')}")
    else:
        print("  ⚠ No ClinVar variants found (may be expected for some genes)")
    
    # Test 4: Full clinical context
    print("\n[Test 4] Getting full clinical context for BRAF...")
    context = await get_gene_clinical_context("BRAF")
    if context.get("found"):
        print(f"  ✓ Clinical context found!")
        print(f"    - Gene function: {context.get('gene_function', 'N/A')[:60]}...")
        print(f"    - Sources: {context.get('sources', [])}")
    else:
        print("  ✗ Failed to get clinical context")
        return False
    
    return True


async def test_rag_engine():
    """Test the RAG engine"""
    print("\n" + "=" * 60)
    print("Testing RAG Engine")
    print("=" * 60)
    
    engine = RagEngine()
    
    # Test with a gene that IS in the fallback (BRCA1)
    print("\n[Test 5] Testing BRCA1 (in fallback database)...")
    result = await engine.get_clinical_context_async("BRCA1", variant_id="17610", prediction="LOF")
    if result.get("found"):
        print(f"  ✓ BRCA1 context found!")
        print(f"    - Summary preview: {result.get('summary', 'N/A')[:100]}...")
        print(f"    - Sources: {result.get('sources', [])}")
    else:
        print("  ✗ Failed to get BRCA1 context")
    
    # Test with a gene NOT in the fallback (EGFR)
    print("\n[Test 6] Testing EGFR (NOT in fallback database - uses API)...")
    result = await engine.get_clinical_context_async("EGFR", prediction="LOF")
    if result.get("found"):
        print(f"  ✓ EGFR context found via API!")
        print(f"    - Summary preview: {result.get('summary', 'N/A')[:100]}...")
        print(f"    - Sources: {result.get('sources', [])}")
    else:
        print("  ✗ Failed to get EGFR context")
        return False
    
    # Test with another gene NOT in fallback (TP53 is in fallback, try KRAS)
    print("\n[Test 7] Testing KRAS (NOT in fallback database - uses API)...")
    result = await engine.get_clinical_context_async("KRAS", prediction="pathogenic")
    if result.get("found"):
        print(f"  ✓ KRAS context found via API!")
        print(f"    - Summary preview: {result.get('summary', 'N/A')[:100]}...")
        print(f"    - Sources: {result.get('sources', [])}")
    else:
        print("  ✗ Failed to get KRAS context")
        return False
    
    # Test with a non-existent gene
    print("\n[Test 8] Testing FAKEGENE123 (should gracefully fail)...")
    result = await engine.get_clinical_context_async("FAKEGENE123")
    if not result.get("found"):
        print(f"  ✓ Correctly returned 'not found' for fake gene")
    else:
        print(f"  ⚠ Unexpected: found context for fake gene")
    
    return True


async def main():
    print("\n" + "=" * 60)
    print("RAG API Integration Test Suite")
    print("=" * 60)
    
    # Test API clients
    api_ok = await test_api_clients()
    
    # Test RAG engine
    rag_ok = await test_rag_engine()
    
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"  API Clients: {'✓ PASSED' if api_ok else '✗ FAILED'}")
    print(f"  RAG Engine:  {'✓ PASSED' if rag_ok else '✗ FAILED'}")
    print("=" * 60)
    
    return api_ok and rag_ok


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
