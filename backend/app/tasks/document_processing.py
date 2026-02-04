# FILE: backend/app/tasks/document_processing.py
# PHOENIX PROTOCOL - UNIFIED INTELLIGENCE WORKER V14.4 (ROBUST INGESTION)
# 1. FIXED: Injected "Identity Chunk" to provide a semantic anchor for conceptual queries.
# 2. FEATURE: Header-aware chunking for CSV/Excel is now mandatory.
# 3. STATUS: Robust retrieval fix applied.

import logging
import os
import shutil
import tempfile
import json
import asyncio
from bson import ObjectId
from typing import Dict, Any, Optional
from datetime import datetime

from app.celery_app import celery_app
from app.core import db

from app.services import (
    vector_store_service,
    accountant_vector_service,
    storage_service,
    text_extraction_service,
    llm_service,
    document_service,
    embedding_service
)
from app.services.albanian_language_detector import AlbanianLanguageDetector

logger = logging.getLogger(__name__)

def publish_sse_update(user_id: str, data: Dict[str, Any]):
    if db.redis_sync_client is None: db.connect_to_redis()
    if db.redis_sync_client:
        try:
            channel = f"user:{user_id}:updates"
            message = json.dumps(data)
            db.redis_sync_client.publish(channel, message)
        except Exception as e:
            logger.error(f"Failed to publish SSE: {e}")

def smart_chunker(text: str, file_type: str, file_name: str, chunk_size: int = 1500, chunk_overlap: int = 200) -> list[str]:
    clean_type = file_type.lower().strip('.')
    chunks = []
    
    # PHOENIX: Inject an "Identity Chunk" so the AI knows what this file is conceptually.
    identity_chunk = f"DOCUMENT_IDENTITY: This file is titled '{file_name}'. Type: {file_type}."
    
    if clean_type in ['csv', 'xlsx', 'xls']:
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        if lines:
            header = lines[0]
            identity_chunk += f" It contains a table with columns: {header}"
            chunks.append(identity_chunk) # Add master context
            chunks.extend([f"FILE: {file_name} | HEADER: {header} | ROW: {line}" for line in lines[1:]])
            return chunks

    from langchain.text_splitter import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks.append(identity_chunk)
    chunks.extend(text_splitter.split_text(text))
    return chunks

@celery_app.task(name="app.tasks.document_processing.process_archive_document", bind=True)
def process_archive_document(self, archive_item_id: str):
    if db.db_instance is None: db.connect_to_mongo()
    db_conn = db.db_instance
    user_id = None
    temp_file_path = ""
    try:
        oid = ObjectId(archive_item_id)
        archive_item = db_conn.archives.find_one({"_id": oid})
        if not archive_item: return

        user_id = str(archive_item["user_id"])
        doc_title = archive_item.get("title") or "Untitled Document"
        file_ext = archive_item.get("file_type", "").lower()
        case_id_str = str(archive_item.get("case_id", ""))

        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "PROCESSING"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "PROCESSING"})
        
        suffix = f".{file_ext}" if file_ext else ".tmp"
        temp_fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
        file_stream = storage_service.get_file_stream(archive_item["storage_key"])
        with os.fdopen(temp_fd, 'wb') as temp_file: shutil.copyfileobj(file_stream, temp_file)
        
        raw_text = text_extraction_service.extract_text(temp_file_path, file_ext)
        if not raw_text or not raw_text.strip(): raise ValueError("Document is empty.")

        # PHOENIX: Improved chunking with Identity Anchor
        chunks = smart_chunker(raw_text, file_ext, doc_title)
        
        is_albanian = AlbanianLanguageDetector.detect_language(raw_text)
        base_metadata = {'language': 'sq' if is_albanian else 'en', 'file_name': doc_title}
        
        # 1. Standard Vectorization
        vector_store_service.create_and_store_embeddings_from_chunks(
            user_id, archive_item_id, case_id_str, doc_title,
            chunks, [base_metadata] * len(chunks)
        )

        # 2. Accountant Vectorization
        accountant_vector_service.store_finance_embeddings(
            user_id=user_id, document_id=archive_item_id,
            file_name=doc_title, chunks=chunks,
            metadatas=[base_metadata.copy() for _ in chunks]
        )

        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "READY"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "READY"})

    except Exception as e:
        db_conn.archives.update_one({"_id": ObjectId(archive_item_id)}, {"$set": {"indexing_status": "FAILED"}})
        raise self.retry(exc=e)
    finally:
        if temp_file_path and os.path.exists(temp_file_path): os.remove(temp_file_path)