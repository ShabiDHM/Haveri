# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V1.8 (MAX-RECALL)
# 1. OPTIMIZATION: Increased recall to ensure CSV rows are always prioritized.
# 2. STATUS: Fully synchronized for Forensic Audit.

from __future__ import annotations
import logging
from typing import List, Dict, Any, cast
from . import vector_store_service as havery_vs
from . import embedding_service

logger = logging.getLogger(__name__)

__all__ = ["store_finance_embeddings", "query_user_financials", "query_tax_and_business_laws", "get_combined_context"]

def store_finance_embeddings(user_id: str, document_id: str, file_name: str, chunks: List[str], metadatas: List[Dict[str, Any]]) -> bool:
    try:
        collection = havery_vs.get_private_collection(user_id)
        embeddings = [embedding_service.generate_embedding(c, language=meta.get('language')) for c, meta in zip(chunks, metadatas)]
        valid_embeddings = cast(Any, [emb for emb in embeddings if emb is not None])
        if not valid_embeddings: return False
        ids = [f"fin_{document_id}_{i}" for i in range(len(valid_embeddings))]
        final_metadatas = []
        for meta in metadatas:
            final_meta = meta.copy()
            final_meta.update({"owner_id": str(user_id), "source_document_id": str(document_id), "file_name": file_name})
            final_metadatas.append(final_meta)
        collection.add(embeddings=valid_embeddings, documents=chunks, metadatas=cast(Any, final_metadatas), ids=ids)
        return True
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        return False

def query_user_financials(user_id: str, query_text: str, n_results: int = 30) -> List[Dict[str, Any]]:
    # PHOENIX: Increased to 30 results to capture all rows of small financial CSVs
    return havery_vs.query_private_diary(user_id, query_text, n_results=n_results)

def query_tax_and_business_laws(query_text: str, n_results: int = 15) -> List[Dict[str, Any]]:
    # PHOENIX: Deep legal retrieval
    legal_findings = havery_vs.query_public_library(query_text, n_results=10, agent_type='legal')
    business_findings = havery_vs.query_public_library(query_text, n_results=5, agent_type='business')
    return legal_findings + business_findings

def get_combined_context(user_id: str, query: str) -> str:
    # Perform a broad search to ensure we don't miss the CSV data
    private_data = query_user_financials(user_id, query)
    # If the user query is specific, we also do a broad "financials" fallback search
    if len(private_data) < 5:
        private_data += query_user_financials(user_id, "fatura transaksione shpenzime", n_results=10)
        
    global_rules = query_tax_and_business_laws(query)
    
    context = "--- DOKUMENTET FINANCIARE TË GJETURA NË ARKIVË ---\n"
    if private_data:
        # Deduplicate results based on content to save tokens
        seen = set()
        for d in private_data:
            if d['content'] not in seen:
                context += f"DOKUMENTI: {d['source']} | DATA: {d['content']}\n"
                seen.add(d['content'])
    else:
        context += "Nuk u gjet asnjë dokument në arkivë.\n"
    
    context += "\n--- BAZA LIGJORE DHE RREGULLORET (ATK) ---\n"
    if global_rules:
        for l in global_rules:
            context += f"LIGJI: {l['content']} | BURIMI: {l['source']}\n"
            
    return context