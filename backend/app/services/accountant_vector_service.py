# FILE: backend/app/services/accountant_vector_service.py
# PHOENIX PROTOCOL - ACCOUNTANT VECTOR V2.0 (IMPORT FIX)
# 1. FIXED: Correctly imported ObjectId from bson.
# 2. STATUS: Fully synchronized and build-ready.

from __future__ import annotations
import logging
from typing import List, Dict, Any, cast
from bson import ObjectId # PHOENIX: Added missing import
from . import vector_store_service as havery_vs
from . import embedding_service
from app.core import db

logger = logging.getLogger(__name__)

__all__ = ["store_finance_embeddings", "query_user_financials", "query_tax_and_business_laws", "get_combined_context"]

def store_finance_embeddings(user_id: str, document_id: str, file_name: str, chunks: List[str], metadatas: List[Dict[str, Any]]) -> bool:
    try:
        collection = havery_vs.get_private_collection(user_id)
        # Generate embeddings for all chunks
        embeddings = [embedding_service.generate_embedding(c, language=meta.get('language')) for c, meta in zip(chunks, metadatas)]
        valid_indices = [i for i, emb in enumerate(embeddings) if emb is not None]
        
        if not valid_indices: return False
        
        final_embeddings = [embeddings[i] for i in valid_indices]
        final_chunks = [chunks[i] for i in valid_indices]
        final_metadatas = []
        
        for i in valid_indices:
            meta = metadatas[i].copy()
            meta.update({
                "owner_id": str(user_id), 
                "source_document_id": str(document_id), 
                "file_name": file_name
            })
            final_metadatas.append(meta)
            
        ids = [f"fin_{document_id}_{i}" for i in range(len(final_chunks))]
        
        collection.add(
            embeddings=cast(Any, final_embeddings), 
            documents=final_chunks, 
            metadatas=cast(Any, final_metadatas), 
            ids=ids
        )
        return True
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        return False

def query_user_financials(user_id: str, query_text: str, n_results: int = 30) -> List[Dict[str, Any]]:
    return havery_vs.query_private_diary(user_id, query_text, n_results=n_results)

def query_tax_and_business_laws(query_text: str, n_results: int = 15) -> List[Dict[str, Any]]:
    # Maintain compatibility with accountant_chat_service if needed
    legal_findings = havery_vs.query_public_library(query_text, n_results=10, agent_type='legal')
    business_findings = havery_vs.query_public_library(query_text, n_results=5, agent_type='business')
    return legal_findings + business_findings

def get_combined_context(user_id: str, query: str) -> str:
    # 1. Check physical existence in Database first
    if db.db_instance is None: db.connect_to_mongo()
    
    # PHOENIX: Fixed attribute access for ObjectId
    archive_count = db.db_instance.archives.count_documents({
        "user_id": ObjectId(user_id), 
        "item_type": "FILE"
    })
    
    # 2. Perform Semantic Search
    private_data = query_user_financials(user_id, query)
    
    # 3. Fallback to general financial retrieval if specific search is weak
    if archive_count > 0 and len(private_data) < 3:
        private_data += query_user_financials(user_id, "dokumente financiare pasqyra faturat", n_results=15)
        
    global_rules = query_tax_and_business_laws(query)
    
    context = "--- DOKUMENTET FINANCIARE TË GJETURA NË ARKIVË ---\n"
    
    if archive_count == 0:
        context += "Arkiva është aktualisht bosht. Nuk ka dokumente për të analizuar.\n"
    elif not private_data:
        context += "Sistemi gjeti dokumente në arkivë, por nuk arriti të nxjerrë të dhëna relevante për këtë pyetje specifike.\n"
    else:
        seen = set()
        for d in private_data:
            if d['content'] not in seen:
                context += f"BURIMI: {d['source']} | PËRMBAJTJA: {d['content']}\n"
                seen.add(d['content'])
    
    context += "\n--- BAZA LIGJORE DHE RREGULLORET ---\n"
    for l in global_rules:
        context += f"LIGJI: {l['content']} | BURIMI: {l['source']}\n"
            
    return context