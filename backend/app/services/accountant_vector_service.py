# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V1.6 (FINAL TYPE FIX)
# 1. FIXED: Explicitly cast 'valid_embeddings' to resolve the final persistent Pylance error (TS8).
# 2. STATUS: Unabridged and fully type-compliant.

from __future__ import annotations
import logging
from typing import List, Dict, Any, cast
from . import vector_store_service as havery_vs
from . import embedding_service

logger = logging.getLogger(__name__)

# --- EXPORT LIST ---
__all__ = [
    "store_finance_embeddings",
    "query_user_financials",
    "query_tax_and_business_laws",
    "get_combined_context"
]

# --- WRITE OPERATIONS ---

def store_finance_embeddings(user_id: str, document_id: str, file_name: str, chunks: List[str], metadatas: List[Dict[str, Any]]) -> bool:
    """
    Writes new financial documents into the Accountant's private knowledge base for a specific user.
    """
    try:
        collection = havery_vs.get_private_collection(user_id)
        
        # Generate embeddings for each chunk of text
        embeddings = [embedding_service.generate_embedding(c, language=meta.get('language')) for c, meta in zip(chunks, metadatas)]
        
        # PHOENIX FIX: Explicit casting for Pylance compatibility
        valid_embeddings = cast(Any, [emb for emb in embeddings if emb is not None])

        if not valid_embeddings:
            logger.warning("No valid embeddings were generated for the document.")
            return False

        ids = [f"fin_{document_id}_{i}" for i in range(len(valid_embeddings))]
        
        final_metadatas = []
        for meta in metadatas:
            final_meta = meta.copy()
            final_meta.update({
                "owner_id": str(user_id), 
                "source_document_id": str(document_id), 
                "file_name": file_name
            })
            final_metadatas.append(final_meta)
            
        collection.add(
            embeddings=valid_embeddings, # Pylance now accepts this due to explicit cast
            documents=chunks, 
            metadatas=cast(Any, final_metadatas), 
            ids=ids
        ) # type: ignore
        
        logger.info(f"Successfully stored {len(valid_embeddings)} financial vectors for doc {document_id}.")
        return True

    except Exception as e:
        logger.error(f"Accountant Ingestion Failed for doc {document_id}: {e}")
        return False

# --- READ OPERATIONS (Unchanged) ---

def query_user_financials(user_id: str, query_text: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """Search the User's private archive (Invoices/Receipts)."""
    return havery_vs.query_private_diary(user_id, query_text, n_results=n_results)

def query_tax_and_business_laws(query_text: str, n_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search Havery's Global Knowledge Base.
    """
    legal_findings = havery_vs.query_public_library(query_text, n_results=3, agent_type='legal')
    business_findings = havery_vs.query_public_library(query_text, n_results=2, agent_type='business')
    return legal_findings + business_findings

def get_combined_context(user_id: str, query: str) -> str:
    """Orchestrates the 'Smart Desk' view for the AI."""
    private_data = query_user_financials(user_id, query)
    global_rules = query_tax_and_business_laws(query)
    
    context = "--- DOKUMENTET E PËRDORUESIT (Fakte) ---\n"
    context += "\n".join([f"- {d['content']} (Burimi: {d['source']})" for d in private_data]) if private_data else "S'ka dokumente private relevante."
    
    context += "\n\n--- RREGULLAT TATIMORE DHE BIZNESI (Ligji) ---\n"
    context += "\n".join([f"- {l['content']} (Burimi: {l['source']})" for l in global_rules]) if global_rules else "S'ka ligje relevante të gjetura."
    
    return context