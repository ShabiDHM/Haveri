# FILE: backend/app/tasks/document_processing.py
# PHOENIX PROTOCOL - UNIFIED ARCHIVE WORKER V10.0 (CLEAN)
# 1. CLEANUP: Removed legacy 'process_document_task' as the Case Document Panel is deprecated.
# 2. CORE LOGIC: 'process_archive_document' is now the SINGLE source of truth for all ingestion.
# 3. FEATURES: Includes Text Extraction, Vector Store Injection, and Real-Time SSE (Green Check).

import logging
import io
import json
from bson import ObjectId
from typing import List, Dict, Any
from pypdf import PdfReader

from app.celery_app import celery_app
from app.core import db
from app.services import (
    vector_store_service,
    storage_service
)

logger = logging.getLogger(__name__)

# --- Text Processing Utilities ---

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extracts text content from raw PDF bytes."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = "".join(page.extract_text() for page in reader.pages if page.extract_text())
        return text
    except Exception as e:
        logger.error(f"pdf_extraction_failed: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> List[str]:
    """Splits a long text into overlapping chunks."""
    if not text: return []
    words = text.split()
    if not words: return []
    chunks = []
    current_pos = 0
    while current_pos < len(words):
        end_pos = current_pos + chunk_size
        chunk = words[current_pos:end_pos]
        chunks.append(" ".join(chunk))
        current_pos += chunk_size - overlap
        if current_pos < 0:
             current_pos = end_pos
    return chunks

# --- SSE Notification ---

def publish_sse_update(user_id: str, data: Dict[str, Any]):
    """Publishes a message to the user's SSE channel via Redis."""
    if db.redis_sync_client:
        channel = f"user:{user_id}:updates"
        message = json.dumps(data)
        db.redis_sync_client.publish(channel, message)
    else:
        logger.warning("Redis client not available for SSE update.")

# --- THE SINGLE INGESTION TASK ---

@celery_app.task(
    name="app.tasks.document_processing.process_archive_document",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60}
)
def process_archive_document(self, archive_item_id: str):
    """
    The Single Source of Truth for Document Ingestion.
    Processes items from the 'archives' collection (User Knowledge Base).
    """
    if db.db_instance is None: db.connect_to_mongo()
    if db.redis_sync_client is None: db.connect_to_redis()
    
    db_conn = db.db_instance
    user_id = None

    try:
        oid = ObjectId(archive_item_id)
        archive_item = db_conn.archives.find_one({"_id": oid})

        if not archive_item:
            logger.error(f"Archive item {archive_item_id} not found.")
            return

        user_id = str(archive_item["user_id"])
        # Support case linking if the archive item is tagged with a case_id
        case_id = str(archive_item.get("case_id", ""))
        storage_key = archive_item.get("storage_key")
        file_name = archive_item.get("title", "Untitled")

        if not storage_key:
            raise FileNotFoundError(f"Storage key missing for item {archive_item_id}.")

        # 1. Notify: PROCESSING (Blue Icon/Spinner)
        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "PROCESSING"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "PROCESSING"})
        logger.info(f"🚀 Processing Archive Document: {file_name} ({archive_item_id})")

        # 2. Download & Extract
        file_stream = storage_service.get_file_stream(storage_key)
        file_bytes = file_stream.read()
        text_content = extract_text_from_pdf_bytes(file_bytes)
        
        # 3. Chunking
        chunks = chunk_text(text_content)
        if not chunks:
            raise ValueError("Document contains no readable text.")
            
        # 4. Vectorize (Knowledge Base Injection)
        logger.info(f"🧠 Injecting {len(chunks)} chunks into Knowledge Base for {file_name}...")
        success = vector_store_service.create_and_store_embeddings_from_chunks(
            user_id=user_id,
            document_id=archive_item_id,
            case_id=case_id,
            file_name=file_name,
            chunks=chunks,
            metadatas=[{}] * len(chunks)
        )

        if not success:
            raise Exception("Failed to store embeddings in Vector Store.")

        # 5. Notify: READY (Green Checkmark)
        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "READY"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "READY"})
        
        logger.info(f"✅ Archive Item Completed: {file_name}")

    except Exception as e:
        error_message = str(e)
        logger.error(f"❌ Processing Failed for {archive_item_id}: {error_message}")
        
        # Notify: FAILED (Red X or Alert)
        try:
            db_conn.archives.update_one({"_id": ObjectId(archive_item_id)}, {"$set": {"indexing_status": "FAILED", "error_message": error_message}})
            if user_id:
                publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "FAILED", "error": error_message})
        except: pass
        
        raise self.retry(exc=e)