"""
LangChain-based RAG Engine for Clinical Context Retrieval
Uses vector store for semantic search and LLM for answer synthesis.
"""

import os
import asyncio
from typing import Dict, Optional, List, Any
from functools import lru_cache

# Load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, use system env vars

# LangChain imports
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.schema import Document

# Try to import API clients for data fetching
try:
    from .api_clients import get_gene_clinical_context, search_gene_id, get_gene_summary, get_clinvar_variants, get_pubmed_abstracts
except ImportError:
    from api_clients import get_gene_clinical_context, search_gene_id, get_gene_summary, get_clinvar_variants, get_pubmed_abstracts


# Clinical context prompt template
CLINICAL_CONTEXT_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template="""You are a clinical genetics expert assistant. Use the following retrieved information to provide a comprehensive clinical context for the genetic variant query.

Retrieved Information:
{context}

Query: {question}

Provide a well-structured clinical interpretation that includes:
1. Gene function and role
2. Clinical significance of variants in this gene
3. Associated conditions or diseases
4. Relevant therapeutic implications if applicable
5. Any important caveats or uncertainties

Be concise but thorough. If information is limited, state that clearly.

Clinical Context:"""
)


class LangChainRAG:
    """LangChain-based RAG engine for clinical variant context retrieval"""
    
    def __init__(self, llm_provider: str = None, api_key: Optional[str] = None):
        """
        Initialize the LangChain RAG engine.
        
        Args:
            llm_provider: One of "gemini", "openai", "ollama", "groq"
            api_key: API key for the LLM provider (not needed for ollama)
        """
        # Read provider from env, default based on available API keys
        if llm_provider is None:
            llm_provider = os.environ.get("LLM_PROVIDER")
            if not llm_provider:
                # Auto-detect based on available keys
                if os.environ.get("GROQ_API_KEY"):
                    llm_provider = "groq"
                elif os.environ.get("OPENAI_API_KEY"):
                    llm_provider = "openai"
                elif os.environ.get("GOOGLE_API_KEY"):
                    llm_provider = "gemini"
                else:
                    llm_provider = "ollama"
        
        self.llm_provider = llm_provider
        self.api_key = api_key or os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        
        # Initialize embeddings (using HuggingFace for free local embeddings)
        print("[LangChain RAG] Initializing embeddings...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'}
        )
        
        # Vector store (will be populated dynamically)
        self.vectorstore = None
        
        # Initialize LLM
        self.llm = self._init_llm()
        
        # Text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ". ", " "]
        )
        
        print(f"[LangChain RAG] Initialized with {llm_provider} LLM")
    
    def _init_llm(self):
        """Initialize the LLM based on provider"""
        if self.llm_provider == "gemini":
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                return ChatGoogleGenerativeAI(
                    model="gemini-pro",
                    google_api_key=self.api_key,
                    temperature=0.3,
                    convert_system_message_to_human=True
                )
            except Exception as e:
                print(f"[LangChain RAG] Failed to init Gemini: {e}")
                return self._get_fallback_llm()
        
        elif self.llm_provider == "openai":
            try:
                from langchain_openai import ChatOpenAI
                return ChatOpenAI(
                    model="gpt-3.5-turbo",
                    api_key=self.api_key,
                    temperature=0.3
                )
            except Exception as e:
                print(f"[LangChain RAG] Failed to init OpenAI: {e}")
                return self._get_fallback_llm()
        
        elif self.llm_provider == "ollama":
            try:
                from langchain_community.llms import Ollama
                return Ollama(model="llama2", temperature=0.3)
            except Exception as e:
                print(f"[LangChain RAG] Failed to init Ollama: {e}")
                return self._get_fallback_llm()
        
        elif self.llm_provider == "groq":
            try:
                from langchain_groq import ChatGroq
                return ChatGroq(
                    model="llama3-8b-8192",
                    api_key=self.api_key or os.environ.get("GROQ_API_KEY"),
                    temperature=0.3
                )
            except Exception as e:
                print(f"[LangChain RAG] Failed to init Groq: {e}")
                return self._get_fallback_llm()
        
        return self._get_fallback_llm()
    
    def _get_fallback_llm(self):
        """Return a simple fallback when no LLM is available"""
        print("[LangChain RAG] Using fallback mode (no LLM synthesis)")
        return None
    
    async def _fetch_documents_for_gene(self, gene_symbol: str) -> List[Document]:
        """Fetch and create documents from external APIs for a gene"""
        documents = []
        
        # Fetch gene info from NCBI
        gene_id = await search_gene_id(gene_symbol)
        
        if gene_id:
            gene_info = await get_gene_summary(gene_id)
            if gene_info:
                # Create document from gene summary
                gene_doc = Document(
                    page_content=f"""Gene: {gene_symbol}
Description: {gene_info.get('description', 'N/A')}
Summary: {gene_info.get('summary', 'N/A')}
Chromosome: {gene_info.get('chromosome', 'N/A')}
Aliases: {gene_info.get('aliases', 'N/A')}""",
                    metadata={
                        "source": "NCBI Gene",
                        "gene_id": gene_id,
                        "gene_symbol": gene_symbol
                    }
                )
                documents.append(gene_doc)
        
        # Fetch ClinVar variants
        variants = await get_clinvar_variants(gene_symbol, limit=10)
        
        if variants:
            # Create document from variant data
            variant_text = f"ClinVar Pathogenic Variants for {gene_symbol}:\n"
            for v in variants:
                variant_text += f"- {v.get('title', 'Unknown')}: {v.get('classification', 'Unknown')}\n"
            
            variant_doc = Document(
                page_content=variant_text,
                metadata={
                    "source": "ClinVar",
                    "gene_symbol": gene_symbol,
                    "variant_count": len(variants)
                }
            )
            documents.append(variant_doc)
        
        # Fetch PubMed abstracts
        pubmed_articles = await get_pubmed_abstracts(gene_symbol, limit=5)
        
        if pubmed_articles:
            # Create document from PubMed data
            pubmed_text = f"Recent PubMed Research on {gene_symbol}:\n"
            for article in pubmed_articles:
                pubmed_text += f"- {article.get('title', 'Unknown')} ({article.get('pubdate', 'N/A')}) - {article.get('source', 'N/A')}\n"
            
            pubmed_doc = Document(
                page_content=pubmed_text,
                metadata={
                    "source": "PubMed",
                    "gene_symbol": gene_symbol,
                    "article_count": len(pubmed_articles)
                }
            )
            documents.append(pubmed_doc)
        
        return documents
    
    def _build_vectorstore(self, documents: List[Document]) -> FAISS:
        """Build FAISS vector store from documents"""
        if not documents:
            return None
        
        # Split documents into chunks
        chunks = self.text_splitter.split_documents(documents)
        
        # Create vector store
        vectorstore = FAISS.from_documents(chunks, self.embeddings)
        return vectorstore
    
    async def get_clinical_context(
        self, 
        gene_symbol: str, 
        variant_id: Optional[str] = None, 
        prediction: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get clinical context using LangChain RAG pipeline.
        
        1. Fetch documents from NCBI/ClinVar APIs
        2. Build vector store for retrieval
        3. Use LLM to synthesize clinical context
        """
        result = {
            "found": False,
            "gene": gene_symbol,
            "summary": "",
            "sources": []
        }
        
        try:
            # Step 1: Fetch documents
            documents = await self._fetch_documents_for_gene(gene_symbol)
            
            if not documents:
                result["summary"] = f"No clinical information found for {gene_symbol}."
                return result
            
            result["found"] = True
            result["sources"] = list(set([doc.metadata.get("source", "Unknown") for doc in documents]))
            
            # If no LLM available, return raw document content
            if self.llm is None:
                context_parts = []
                for doc in documents:
                    context_parts.append(doc.page_content)
                result["summary"] = "\n\n".join(context_parts)
                return result
            
            # Step 2: Build vector store
            vectorstore = self._build_vectorstore(documents)
            
            if vectorstore is None:
                result["summary"] = "Failed to build knowledge index."
                return result
            
            # Step 3: Create retrieval chain
            retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
            
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=retriever,
                chain_type_kwargs={"prompt": CLINICAL_CONTEXT_PROMPT}
            )
            
            # Step 4: Generate clinical context
            query = f"Provide clinical context for gene {gene_symbol}"
            if variant_id:
                query += f", variant ID {variant_id}"
            if prediction:
                query += f". The variant is predicted to be {prediction}."
            
            response = qa_chain.invoke({"query": query})
            
            result["summary"] = response.get("result", "No context generated.")
            result["sources"].append("LLM Synthesis")
            
        except Exception as e:
            print(f"[LangChain RAG] Error: {e}")
            # Fallback to direct API result
            try:
                api_result = await get_gene_clinical_context(gene_symbol, variant_id)
                if api_result.get("found"):
                    result["found"] = True
                    result["summary"] = f"**Gene Function:** {api_result.get('gene_function', 'N/A')}\n\n"
                    if api_result.get("summary"):
                        result["summary"] += f"**Summary:** {api_result['summary'][:500]}...\n\n"
                    if api_result.get("pathogenic_variants"):
                        result["summary"] += f"**Pathogenic Variants:** {len(api_result['pathogenic_variants'])} reported in ClinVar"
                    result["sources"] = api_result.get("sources", [])
            except:
                result["summary"] = f"Failed to retrieve clinical context for {gene_symbol}."
        
        return result
    
    def get_clinical_context_sync(
        self, 
        gene_symbol: str, 
        variant_id: Optional[str] = None, 
        prediction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Synchronous wrapper for get_clinical_context"""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run, 
                        self.get_clinical_context(gene_symbol, variant_id, prediction)
                    )
                    return future.result(timeout=60)
            else:
                return loop.run_until_complete(
                    self.get_clinical_context(gene_symbol, variant_id, prediction)
                )
        except RuntimeError:
            return asyncio.run(self.get_clinical_context(gene_symbol, variant_id, prediction))


# Singleton instance
_langchain_rag = None

def get_langchain_rag(llm_provider: str = "gemini", api_key: Optional[str] = None) -> LangChainRAG:
    """Get or create the LangChain RAG singleton"""
    global _langchain_rag
    if _langchain_rag is None:
        _langchain_rag = LangChainRAG(llm_provider=llm_provider, api_key=api_key)
    return _langchain_rag
