# FILE: backend/app/services/vector_store_service.py
# PHOENIX PROTOCOL - VECTOR STORE V3.1 (CHAT SUPPORT)
# 1. FEATURE: Added 'similarity_search' wrapper to support the Archive Chat feature.
# 2. LOGIC: Updated 'query_private_diary' to support generic metadata filtering (e.g., specific document ID).
# 3. TYPE SAFETY: Maintains Pylance compatibility.

from __future__ import annotations
import os
import time
import logging
from typing import List, Dict, Optional, Any, Sequence, cast
from langchain_core.documents import Document  # Required for return type compatibility
import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

logger = logging.getLogger(__name__)

# --- CONFIGURATION ---
CHROMA_HOST = os.getenv("CHROMA_HOST", "chroma")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", 8000))

LEGAL_KB_COLLECTION_NAME = "legal_knowledge_base"
BUSINESS_KB_COLLECTION_NAME = "business_knowledge_base"

_client: Optional[ClientAPI] = None
_legal_kb_collection: Optional[Collection] = None
_business_kb_collection: Optional[Collection] = None
_active_user_collections: Dict[str, Collection] = {}

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
            
            if not _business_kb_collection:
                _business_kb_collection = _client.get_or_create_collection(name=BUSINESS_KB_COLLECTION_NAME)

            logger.info("✅ Connected to ChromaDB (Agentic Mode Ready).")
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

# --- AGENT TOOL 1: PRIVATE DIARY ---
def query_private_diary(
    user_id: str,
    query_text: str,
    n_results: int = 5,
    filter_criteria: Optional[Dict[str, Any]] = None # PHOENIX: Added generic filter support
) -> List[Dict[str, Any]]:
    """
    Searches the user's private, isolated data.
    """
    from . import embedding_service
    embedding = embedding_service.generate_embedding(query_text)
    if not embedding: return []

    results = []
    try:
        user_coll = get_private_collection(user_id)
        
        # Build filter from criteria
        where_filter = filter_criteria if filter_criteria else {}
        
        # Cast to Any to satisfy Pylance strict typing
        final_where = cast(Any, where_filter) if where_filter else None

        res = user_coll.query(
            query_embeddings=[embedding], 
            n_results=n_results, 
            where=final_where
        ) # type: ignore

        if res and res['documents'] and res['documents'][0]:
            docs = res['documents'][0]
            metas = res['metadatas'][0] if res['metadatas'] else [{}] * len(docs)
            
            for d, m in zip(docs, metas):
                results.append({
                    "content": d,
                    "source": (m or {}).get("file_name", "Private Doc"),
                    "type": "PRIVATE_DATA"
                })
    except Exception as e:
        logger.warning(f"Private Diary Query failed for {user_id}: {e}")
    
    return results

# --- PHOENIX WRAPPER: SIMILARITY SEARCH ---
async def similarity_search(user_id: str, query: str, limit: int = 4, filter_criteria: Optional[Dict[str, Any]] = None) -> List[Document]:
    """
    Wrapper for ArchiveService compatibility. 
    Maps the generic query request to 'query_private_diary' and returns LangChain Document objects.
    """
    # Map 'doc_id' from ArchiveService to 'source_document_id' in Chroma metadata
    chroma_filter = {}
    if filter_criteria and "doc_id" in filter_criteria:
        chroma_filter["source_document_id"] = str(filter_criteria["doc_id"])
    
    results = query_private_diary(user_id, query, n_results=limit, filter_criteria=chroma_filter)
    
    # Convert Dict results to LangChain Document objects
    lc_docs = []
    for r in results:
        lc_docs.append(Document(page_content=r["content"], metadata={"source": r["source"]}))
        
    return lc_docs

# --- AGENT TOOL 2: PUBLIC LIBRARY ---
def query_public_library(
    query_text: str,
    n_results: int = 5,
    agent_type: str = 'business' # 'business' or 'legal'
) -> List[Dict[str, Any]]:
    """
    Searches the shared public knowledge base (Laws or Business Regs).
    """
    from . import embedding_service
    embedding = embedding_service.generate_embedding(query_text)
    if not embedding: return []

    results = []
    try:
        target_collection = get_legal_kb_collection() if agent_type == 'legal' else get_business_kb_collection()
        source_label = "Ligj/Rregullore" if agent_type == 'legal' else "Artikull Biznesi"

        res = target_collection.query(query_embeddings=[embedding], n_results=n_results) # type: ignore
        
        if res and res['documents'] and res['documents'][0]:
            docs = res['documents'][0]
            metas = res['metadatas'][0] if res['metadatas'] else [{}] * len(docs)
            
            for d, m in zip(docs, metas):
                results.append({
                    "content": d,
                    "source": (m or {}).get("source", source_label),
                    "type": "PUBLIC_KNOWLEDGE"
                })
    except Exception as e:
        logger.warning(f"Public Library Query failed: {e}")

    return results

# --- WRITE OPERATIONS (Unchanged) ---
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

def delete_user_collection(user_id: str):
    client = get_client()
    try:
        client.delete_collection(name=f"user_{user_id}")
        if user_id in _active_user_collections: del _active_user_collections[user_id]
    except Exception as e: logger.warning(f"Failed to delete user collection: {e}")

def delete_document_embeddings(user_id: str, document_id: str):
    try: 
        coll = get_private_collection(user_id)
        coll.delete(where={"source_document_id": str(document_id)})
    except Exception as e: logger.warning(f"Failed to delete vectors: {e}")