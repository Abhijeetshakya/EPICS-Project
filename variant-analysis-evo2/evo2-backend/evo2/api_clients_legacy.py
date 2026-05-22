"""
API Clients for Clinical Context Retrieval
Provides async clients for NCBI Gene, ClinVar, and related genomics databases.
"""

import httpx
import asyncio
from typing import Dict, Optional, List, Any, Tuple
import time

# Simple in-memory cache with TTL
_cache: Dict[str, Tuple[Any, float]] = {}  # key -> (value, timestamp)
CACHE_TTL = 3600  # 1 hour


def _get_cached(key: str) -> Any:
    """Get cached value if not expired"""
    if key in _cache:
        value, timestamp = _cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return value
        del _cache[key]
    return None


def _set_cached(key: str, value: Any) -> None:
    """Set cache value with timestamp"""
    _cache[key] = (value, time.time())


async def search_gene_id(gene_symbol: str) -> Optional[str]:
    """
    Search for NCBI Gene ID using E-utilities esearch
    """
    cache_key = f"gene_id:{gene_symbol.upper()}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return str(cached)
    
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    params = {
        "db": "gene",
        "term": f"{gene_symbol}[sym] AND human[organism]",
        "retmode": "json",
        "retmax": "1"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            id_list = data.get("esearchresult", {}).get("idlist", [])
            if id_list:
                gene_id = id_list[0]
                _set_cached(cache_key, gene_id)
                return gene_id
    except Exception as e:
        print(f"[API] Error searching gene ID for {gene_symbol}: {e}")
    
    return None


async def get_gene_summary(gene_id: str) -> Optional[Dict[str, Any]]:
    """
    Get gene summary from NCBI Gene database using esummary
    Returns gene function, summary, and associated conditions
    """
    cache_key = f"gene_summary:{gene_id}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    
    url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
    params = {
        "db": "gene",
        "id": gene_id,
        "retmode": "json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("result") and gene_id in data["result"]:
                gene_data = data["result"][gene_id]
                result: Dict[str, Any] = {
                    "gene_id": gene_id,
                    "symbol": gene_data.get("name", ""),
                    "description": gene_data.get("description", ""),
                    "summary": gene_data.get("summary", ""),
                    "chromosome": gene_data.get("chromosome", ""),
                    "aliases": gene_data.get("otheraliases", ""),
                    "gene_type": gene_data.get("genetypeid", "")
                }
                _set_cached(cache_key, result)
                return result
    except Exception as e:
        print(f"[API] Error fetching gene summary for {gene_id}: {e}")
    
    return None


async def get_clinvar_variants(gene_symbol: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get pathogenic variants from ClinVar for a gene
    """
    cache_key = f"clinvar:{gene_symbol.upper()}:{limit}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    
    # First search for variant IDs
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    search_params = {
        "db": "clinvar",
        "term": f"{gene_symbol}[gene] AND (pathogenic[clinsig] OR likely_pathogenic[clinsig])",
        "retmode": "json",
        "retmax": str(limit)
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Search for variant IDs
            search_response = await client.get(search_url, params=search_params)
            search_response.raise_for_status()
            search_data = search_response.json()
            
            variant_ids = search_data.get("esearchresult", {}).get("idlist", [])
            
            if not variant_ids:
                _set_cached(cache_key, [])
                return []
            
            # Get variant summaries
            summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            summary_params = {
                "db": "clinvar",
                "id": ",".join(variant_ids),
                "retmode": "json"
            }
            
            summary_response = await client.get(summary_url, params=summary_params)
            summary_response.raise_for_status()
            summary_data = summary_response.json()
            
            variants: List[Dict[str, Any]] = []
            if summary_data.get("result") and summary_data["result"].get("uids"):
                for uid in summary_data["result"]["uids"]:
                    var_data = summary_data["result"][uid]
                    germline_class = var_data.get("germline_classification", {})
                    if isinstance(germline_class, dict):
                        classification = germline_class.get("description", "Unknown")
                        last_evaluated = germline_class.get("last_evaluated", "")
                    else:
                        classification = "Unknown"
                        last_evaluated = ""
                    
                    variants.append({
                        "clinvar_id": uid,
                        "title": var_data.get("title", ""),
                        "classification": classification,
                        "variation_type": var_data.get("obj_type", ""),
                        "last_evaluated": last_evaluated
                    })
            
            _set_cached(cache_key, variants)
            return variants
            
    except Exception as e:
        print(f"[API] Error fetching ClinVar data for {gene_symbol}: {e}")
    
    return []


async def get_gene_clinical_context(gene_symbol: str, variant_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Main function to get comprehensive clinical context for a gene
    Combines data from NCBI Gene and ClinVar
    """
    result: Dict[str, Any] = {
        "found": False,
        "gene": gene_symbol,
        "gene_function": None,
        "summary": None,
        "clinical_implications": None,
        "pathogenic_variants": [],
        "sources": []
    }
    
    # Step 1: Get gene ID
    gene_id = await search_gene_id(gene_symbol)
    
    if gene_id:
        # Step 2: Get gene summary
        gene_info = await get_gene_summary(gene_id)
        
        if gene_info:
            result["found"] = True
            result["gene_function"] = gene_info.get("description", "")
            result["summary"] = gene_info.get("summary", "")
            result["sources"].append(f"NCBI Gene (ID: {gene_id})")
    
    # Step 3: Get ClinVar variants
    clinvar_variants = await get_clinvar_variants(gene_symbol, limit=5)
    
    if clinvar_variants:
        result["found"] = True
        result["pathogenic_variants"] = clinvar_variants
        result["sources"].append("ClinVar")
        
        # Generate clinical implications from variant data
        pathogenic_count = len([v for v in clinvar_variants if "pathogenic" in str(v.get("classification", "")).lower()])
        if pathogenic_count > 0:
            result["clinical_implications"] = f"{pathogenic_count} known pathogenic variant(s) reported in ClinVar for this gene."
    
    return result


async def get_pubmed_abstracts(gene_symbol: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch recent PubMed abstracts related to a gene
    """
    cache_key = f"pubmed:{gene_symbol.upper()}:{limit}"
    cached = _get_cached(cache_key)
    if cached is not None:
        return cached
    
    # Search for PubMed articles
    search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    search_params = {
        "db": "pubmed",
        "term": f"{gene_symbol}[gene] AND (pathogenic OR clinical OR variant)",
        "retmode": "json",
        "retmax": str(limit),
        "sort": "relevance"
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Search for article IDs
            search_response = await client.get(search_url, params=search_params)
            search_response.raise_for_status()
            search_data = search_response.json()
            
            article_ids = search_data.get("esearchresult", {}).get("idlist", [])
            
            if not article_ids:
                _set_cached(cache_key, [])
                return []
            
            # Get article summaries
            summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            summary_params = {
                "db": "pubmed",
                "id": ",".join(article_ids),
                "retmode": "json"
            }
            
            summary_response = await client.get(summary_url, params=summary_params)
            summary_response.raise_for_status()
            summary_data = summary_response.json()
            
            articles: List[Dict[str, Any]] = []
            if summary_data.get("result") and summary_data["result"].get("uids"):
                for uid in summary_data["result"]["uids"]:
                    article = summary_data["result"][uid]
                    articles.append({
                        "pmid": uid,
                        "title": article.get("title", ""),
                        "source": article.get("source", ""),
                        "pubdate": article.get("pubdate", ""),
                        "authors": ", ".join([a.get("name", "") for a in article.get("authors", [])[:3]])
                    })
            
            _set_cached(cache_key, articles)
            return articles
            
    except Exception as e:
        print(f"[API] Error fetching PubMed data for {gene_symbol}: {e}")
    
    return []


# Convenience function for synchronous code
def get_gene_clinical_context_sync(gene_symbol: str, variant_id: Optional[str] = None) -> Dict[str, Any]:
    """Synchronous wrapper for get_gene_clinical_context"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(get_gene_clinical_context(gene_symbol, variant_id))
