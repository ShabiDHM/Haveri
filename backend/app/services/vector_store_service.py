# FILE: backend/app/services/vector_store_service.py
# PHOENIX PROTOCOL - DUAL KNOWLEDGE BASE ARCHITECTURE
# 1. ARCHITECTURE: Added support for a new 'business_knowledge_base' collection.
# 2. REFACTOR: 'query_mixed_intelligence' now accepts an 'agent_type' ('legal' or 'business').
# 3. LOGIC: Based on the agent_type, the service now queries the correct public knowledge base (Legal or Business).

from __future__ import annotations
import os
import time
import logging
from typing import List, Dict, Optional, Any, Sequence, cast
import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
CHROMA_HOST = os.getenv("CHROMA_HOST", "chroma")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", 8000))

# PHOENIX: Define collection names for both knowledge bases
LEGAL_KB_COLLECTION_NAME = "legal_knowledge_base"
BUSINESS_KB_COLLECTION_NAME = "business_knowledge_base"

_client: Optional[ClientAPI] = None
_legal_kb_collection: Optional[Collection] = None
_business_kb_collection: Optional[Collection] = None

_active_user_collections: Dict[str, Collection] = {}
VECTOR_WRITE_BATCH_SIZE = 64

def connect_chroma_db():
    global _client, _legal_kb_collection, _business_kb_collection
    if _client and _legal_kb_collection and _business_kb_collection: return

    retries = 5
    while retries > 0:
        try:
            if not _client:
                _client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
                _client.heartbeat()
            
            if not _legal_kb_collection:
                _legal_kb_collection = _client.get_or_create_collection(name=LEGAL_KB_COLLECTION_NAME)
            
            # PHOENIX: Initialize the new business knowledge base collection
            if not _business_kb_collection:
                _business_kb_collection = _client.get_or_create_collection(name=BUSINESS_KB_COLLECTION_NAME)

            logger.info("✅ Connected to ChromaDB & All Public Libraries (Legal & Business).")
            return
        except Exception as e:
            retries -= 1
            logger.warning(f"ChromaDB connection error: {e}. Retrying... ({retries} left)")
            time.sleep(5)
            
    logger.critical("❌ Failed to connect to ChromaDB.")

def get_client() -> ClientAPI:
    if _client is None: connect_chroma_db()
    return _client # type: ignore

def get_legal_kb_collection() -> Collection:
    if _legal_kb_collection is None: connect_chroma_db()
    return _legal_kb_collection # type: ignore

# PHOENIX: New accessor for the business KB
def get_business_kb_collection() -> Collection:
    if _business_kb_collection is None: connect_chroma_db()
    return _business_kb_collection # type: ignore

def get_private_collection(user_id: str) -> Collection:
    if not user_id: raise ValueError("User ID is required for Vector Access.")
    if user_id in _active_user_collections: return _active_user_collections[user_id]
    client = get_client()
    collection_name = f"user_{user_id}"
    collection = client.get_or_create_collection(name=collection_name)
    _active_user_collections[user_id] = collection
    return collection

def create_and_store_embeddings_from_chunks(user_id: str, document_id: str, case_id: str, file_name: str, chunks: List[str], metadatas: Sequence[Dict[str, Any]]) -> bool:
    from . import embedding_service
    try: collection = get_private_collection(user_id)
    except Exception as e: logger.error(f"Failed to access private collection for user {user_id}: {e}"); return False
    
    embeddings, processed_chunks = [], []
    source_tag = f"[[BURIMI: {file_name}]] "
    for i, chunk in enumerate(chunks):
        tagged_chunk = f"{source_tag}{chunk}"
        processed_chunks.append(tagged_chunk)
        emb = embedding_service.generate_embedding(tagged_chunk, language=metadatas[i].get('language'))
        if emb: embeddings.append(emb)
    
    if not embeddings: return False
    ids = [f"{document_id}_{int(time.time())}_{i}" for i in range(len(processed_chunks))]
    
    sanitized_metadatas = []
    for meta in metadatas:
        sanitized_meta = {k: ", ".join(map(str, v)) if isinstance(v, list) else v for k, v in meta.items()}
        sanitized_metadatas.append(sanitized_meta)

    final_metadatas = [{**meta, 'source_document_id': str(document_id), 'case_id': str(case_id), 'file_name': file_name, 'owner_id': str(user_id)} for meta in sanitized_metadatas]
    
    try: collection.add(embeddings=embeddings, documents=processed_chunks, metadatas=final_metadatas, ids=ids); return True # type: ignore
    except Exception as e: logger.error(f"Batch Add Failed for User {user_id}: {e}", exc_info=True); return False

# PHOENIX: Refactored to accept agent_type
def query_mixed_intelligence(
    user_id: str,
    query_text: str,
    agent_type: str = 'business', # Default to business for chat
    n_results: int = 10,
    case_context_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    from . import embedding_service
    embedding = embedding_service.generate_embedding(query_text)
    if not embedding: return []

    combined_results = []

    # 1. Query Private Data (Always runs)
    try:
        user_coll = get_private_collection(user_id)
        where_filter = {"case_id": {"$eq": str(case_context_id)}} if case_context_id and case_context_id != "general" else {}
        private_res = user_coll.query(query_embeddings=[embedding], n_results=n_results, where=where_filter if where_filter else None) # type: ignore
        if private_res and private_res['documents'] and private_res['documents'][0]:
            docs, metas = private_res['documents'][0], private_res['metadatas'][0] if private_res['metadatas'] else [{}] * len(private_res['documents'][0])
            for d, m in zip(docs, metas): combined_results.append({"text": d, "source": (m or {}).get("file_name", "Dokument Privat"), "type": "PRIVATE_DATA"})
    except Exception as e: logger.warning(f"Private Query failed for {user_id}: {e}")

    # 2. Query Public Library (Switches based on agent)
    try:
        public_collection, source_name, where_clause = None, "Burim", {}
        if agent_type == 'legal':
            public_collection = get_legal_kb_collection()
            source_name = "Ligj"
            where_clause = {"jurisdiction": {"$eq": 'ks'}}
        else: # business
            public_collection = get_business_kb_collection()
            source_name = "Artikull Biznesi"
            # We can add metadata filters for business docs too, e.g., by category
            where_clause = {} 

        kb_res = public_collection.query(query_embeddings=[embedding], n_results=5, where=where_clause if where_clause else None) # type: ignore
        
        if kb_res and kb_res['documents'] and kb_res['documents'][0]:
            docs, metas = kb_res['documents'][0], kb_res['metadatas'][0] if kb_res['metadatas'] else [{}] * len(kb_res['documents'][0])
            for d, m in zip(docs, metas): combined_results.append({"text": d, "source": (m or {}).get("source", source_name), "type": "PUBLIC_KNOWLEDGE"})
    except Exception as e: logger.warning(f"Public KB Query failed for agent {agent_type}: {e}")

    return combined_results

def delete_user_collection(user_id: str):
    client = get_client()
    try:
        client.delete_collection(name=f"user_{user_id}")
        if user_id in _active_user_collections: del _active_user_collections[user_id]
        logger.info(f"🗑️ Deleted Collection for User: {user_id}")
    except Exception as e: logger.warning(f"Failed to delete user collection: {e}")

def delete_document_embeddings(user_id: str, document_id: str):
    try: 
        coll = get_private_collection(user_id)
        coll.delete(where={"source_document_id": str(document_id)})
        logger.info(f"🗑️ Deleted Vectors for Doc: {document_id} (User: {user_id})")
    except Exception as e: logger.warning(f"Failed to delete vectors: {e}")