# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V1.7 (DEEP SEARCH)
# 1. OPTIMIZATION: Increased n_results to 20 to capture entire CSV tables.
# 2. ISOLATION: Strictly utilizes Havery's Global Knowledge Bases.
# 3. STATUS: Unabridged replacement.

from __future__ import annotations
import logging
from typing import List, Dict, Any, cast
from . import vector_store_service as havery_vs
from . import embedding_service

logger = logging.getLogger(__name__)

__all__ = [
    "store_finance_embeddings",
    "query_user_financials",
    "query_tax_and_business_laws",
    "get_combined_context"
]

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
        logger.error(f"Accountant Ingestion Failed: {e}")
        return False

def query_user_financials(user_id: str, query_text: str, n_results: int = 20) -> List[Dict[str, Any]]:
    # PHOENIX: Increased n_results to 20 to ensure small CSVs are read entirely
    return havery_vs.query_private_diary(user_id, query_text, n_results=n_results)

def query_tax_and_business_laws(query_text: str, n_results: int = 10) -> List[Dict[str, Any]]:
    # PHOENIX: Increased law retrieval depth
    legal_findings = havery_vs.query_public_library(query_text, n_results=6, agent_type='legal')
    business_findings = havery_vs.query_public_library(query_text, n_results=4, agent_type='business')
    return legal_findings + business_findings

def get_combined_context(user_id: str, query: str) -> str:
    private_data = query_user_financials(user_id, query)
    global_rules = query_tax_and_business_laws(query)
    
    # Debug log to verify if data is actually coming out of the DB
    logger.info(f"🔎 Audit Search: Found {len(private_data)} user snippets and {len(global_rules)} law snippets.")

    context = "--- DOKUMENTET FINANCIARE TË PËRDORUESIT ---\n"
    if private_data:
        # PHOENIX: Added labels to help AI identify content vs source
        context += "\n".join([f"E DHËNË: {d['content']} | BURIMI: {d['source']}" for d in private_data])
    else:
        context += "ALARM: Nuk u gjet asnjë dokument relevant në arkivë.\n"
    
    context += "\n\n--- RREGULLAT E ATK DHE LIGJET ---\n"
    if global_rules:
        context += "\n".join([f"LIGJI: {l['content']} | BURIMI: {l['source']}" for l in global_rules])
    else:
        context += "S'ka ligje relevante të gjetura.\n"
    
    return context