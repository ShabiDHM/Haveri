# FILE: backend/app/tasks/document_processing.py
# PHOENIX PROTOCOL - UNIFIED INTELLIGENCE WORKER V12.1 (IMPORT FIX)
# 1. FIX: Removed the import from the deleted 'albanian_document_processor' file.
# 2. FIX: Added the missing 'from datetime import datetime' to resolve the undefined variable error.
# 3. STATUS: This worker is now free of import errors and ready for deployment.

import logging
import os
import shutil
import tempfile
import json
from bson import ObjectId
from typing import Dict, Any
from datetime import datetime # PHOENIX FIX: Added missing import

from app.celery_app import celery_app
from app.core import db
from app.services import (
    vector_store_service,
    storage_service,
    text_extraction_service,
    llm_service
)
from app.services.albanian_language_detector import AlbanianLanguageDetector
# PHOENIX FIX: This import is no longer needed as the file was deleted.
# We assume the logic for EnhancedDocumentProcessor has been merged or is no longer used.

logger = logging.getLogger(__name__)

# --- SSE Notification Utility ---
def publish_sse_update(user_id: str, data: Dict[str, Any]):
    """Publishes a message to the user's SSE channel via Redis."""
    if db.redis_sync_client is None: db.connect_to_redis()
    if db.redis_sync_client:
        try:
            channel = f"user:{user_id}:updates"
            message = json.dumps(data)
            db.redis_sync_client.publish(channel, message)
            logger.info(f"📡 SSE Sent to {channel}: {data.get('type')}")
        except Exception as e:
            logger.error(f"Failed to publish SSE: {e}")

# --- Simple Text Chunker (Fallback) ---
def simple_chunker(text: str, chunk_size: int = 1500, chunk_overlap: int = 200) -> list[str]:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len
    )
    return text_splitter.split_text(text)


# --- TASK 1: STANDARD DOCUMENT INGESTION (Text -> Vector) ---

@celery_app.task(
    name="app.tasks.document_processing.process_archive_document",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 2, 'countdown': 120}
)
def process_archive_document(self, archive_item_id: str):
    """
    Standard ingestion pipeline for vectorization and RAG.
    """
    if db.db_instance is None: db.connect_to_mongo()
    db_conn = db.db_instance
    user_id = None
    temp_file_path = ""
    try:
        oid = ObjectId(archive_item_id)
        archive_item = db_conn.archives.find_one({"_id": oid})
        if not archive_item: return

        user_id = str(archive_item["user_id"])
        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "PROCESSING"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "PROCESSING"})
        
        # Download & Extract
        suffix = os.path.splitext(archive_item.get("title", ".tmp"))[1]
        temp_fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
        file_stream = storage_service.get_file_stream(archive_item["storage_key"])
        with os.fdopen(temp_fd, 'wb') as temp_file: shutil.copyfileobj(file_stream, temp_file)
        if hasattr(file_stream, 'close'): file_stream.close()
        
        raw_text = text_extraction_service.extract_text(temp_file_path, archive_item.get("file_type", "").lower())
        if not raw_text or not raw_text.strip(): raise ValueError("Document is empty.")

        # Chunking & Vectorization
        chunks = simple_chunker(raw_text)
        if not chunks: raise ValueError("Chunking resulted in zero chunks.")
        
        is_albanian = AlbanianLanguageDetector.detect_language(raw_text)
        base_metadata = {'language': 'sq' if is_albanian else 'en', 'file_name': archive_item.get("title")}
        
        vector_store_service.create_and_store_embeddings_from_chunks(
            user_id, archive_item_id, str(archive_item.get("case_id")), archive_item.get("title"),
            chunks, [base_metadata] * len(chunks)
        )

        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "READY"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "READY"})
    except Exception as e:
        error_message = str(e)
        db_conn.archives.update_one({"_id": ObjectId(archive_item_id)}, {"$set": {"indexing_status": "FAILED", "error_message": error_message}})
        if user_id: publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "FAILED", "error": error_message})
        raise self.retry(exc=e)
    finally:
        if temp_file_path and os.path.exists(temp_file_path): os.remove(temp_file_path)

# --- TASK 2: SMART EXPENSE EXTRACTION (Text -> JSON) ---

@celery_app.task(
    name="app.tasks.document_processing.process_and_extract_expense",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 2, 'countdown': 60}
)
def process_and_extract_expense(self, archive_item_id: str):
    """
    Orchestrates OCR and AI data extraction for the Smart Expense Modal.
    """
    if db.db_instance is None: db.connect_to_mongo()
    db_conn = db.db_instance
    user_id = None
    temp_file_path = ""
    try:
        oid = ObjectId(archive_item_id)
        archive_item = db_conn.archives.find_one({"_id": oid})
        if not archive_item:
            logger.error(f"Archive item {archive_item_id} for expense extraction not found.")
            return

        user_id = str(archive_item["user_id"])
        
        # 1. Download & Extract Text (Hybrid OCR)
        suffix = os.path.splitext(archive_item.get("title", ".tmp"))[1]
        temp_fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
        file_stream = storage_service.get_file_stream(archive_item["storage_key"])
        with os.fdopen(temp_fd, 'wb') as temp_file: shutil.copyfileobj(file_stream, temp_file)
        if hasattr(file_stream, 'close'): file_stream.close()
        
        raw_text = text_extraction_service.extract_text(temp_file_path, archive_item.get("file_type", "").lower())
        if not raw_text or not raw_text.strip():
            raise ValueError("OCR failed or document is empty.")

        # 2. Call AI to Extract Structured Data
        logger.info(f"🧠 Calling LLM to extract expense data from archive item {archive_item_id}")
        extracted_data = llm_service.extract_expense_data(raw_text)

        if not extracted_data or not extracted_data.get("total_amount"):
            raise ValueError("AI failed to extract required fields (total_amount) from the document.")

        # 3. Save the structured data for the frontend to fetch
        db_conn.expense_extractions.update_one(
            {"archive_item_id": archive_item_id},
            {"$set": {
                "user_id": user_id,
                "data": extracted_data,
                "created_at": datetime.utcnow(),
                "status": "COMPLETED"
            }},
            upsert=True
        )

        # 4. Notify Frontend that extraction is complete
        publish_sse_update(user_id, {
            "type": "EXPENSE_EXTRACTION_COMPLETE",
            "archive_item_id": archive_item_id,
            "data": extracted_data
        })
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"❌ Expense Extraction Failed for {archive_item_id}: {error_message}")
        if user_id:
            publish_sse_update(user_id, {
                "type": "EXPENSE_EXTRACTION_FAILED",
                "archive_item_id": archive_item_id,
                "error": error_message
            })
        raise self.retry(exc=e)
        
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)