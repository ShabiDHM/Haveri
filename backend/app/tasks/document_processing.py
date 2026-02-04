# FILE: backend/app/tasks/document_processing.py
# PHOENIX PROTOCOL - UNIFIED INTELLIGENCE WORKER V14.3 (SMART DATA INGESTION)
# 1. FEATURE: Implemented 'smart_chunker' to preserve row integrity for CSV/Excel data.
# 2. FEATURE: Header-Injection for CSV chunks to provide context to the Forensic Agent.
# 3. STATUS: Complete and unabridged replacement.

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

# --- PHOENIX: Smart Row-Aware Chunker ---
def smart_chunker(text: str, file_type: str, chunk_size: int = 1500, chunk_overlap: int = 200) -> list[str]:
    """
    Specialized chunking:
    - CSV/XLSX: Splits by line and injects headers for AI context.
    - Standard: Uses character splitting.
    """
    clean_type = file_type.lower().strip('.')
    
    if clean_type in ['csv', 'xlsx', 'xls']:
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        if not lines:
            return []
        
        header = lines[0]
        # Create row-based chunks with header context for the Accountant
        return [f"HEADER: {header} | DATA_ROW: {line}" for line in lines[1:]]

    from langchain.text_splitter import RecursiveCharacterTextSplitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len
    )
    return text_splitter.split_text(text)


# --- TASK 1: UNIFIED DOCUMENT INGESTION ---
@celery_app.task(
    name="app.tasks.document_processing.process_archive_document",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 2, 'countdown': 120}
)
def process_archive_document(self, archive_item_id: str):
    """
    Dual-Ingestion Pipeline: Feeds both standard RAG and the Forensic Accountant.
    Uses smart row-aware chunking for financial data files.
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
        doc_title = archive_item.get("title") or "Untitled Document"
        file_ext = archive_item.get("file_type", "").lower()
        raw_case_id = archive_item.get("case_id")
        case_id_str = str(raw_case_id) if raw_case_id else ""

        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "PROCESSING"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "PROCESSING"})
        
        # Download & Extract
        suffix = f".{file_ext}" if file_ext else ".tmp"
        temp_fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
        file_stream = storage_service.get_file_stream(archive_item["storage_key"])
        with os.fdopen(temp_fd, 'wb') as temp_file: shutil.copyfileobj(file_stream, temp_file)
        if hasattr(file_stream, 'close'): file_stream.close()
        
        raw_text = text_extraction_service.extract_text(temp_file_path, file_ext)
        if not raw_text or not raw_text.strip(): raise ValueError("Document is empty.")

        # PHOENIX: Use Smart Chunker to preserve financial row integrity
        chunks = smart_chunker(raw_text, file_ext)
        if not chunks: raise ValueError("Chunking resulted in zero chunks.")
        
        is_albanian = AlbanianLanguageDetector.detect_language(raw_text)
        base_metadata = {'language': 'sq' if is_albanian else 'en', 'file_name': doc_title}
        
        # 1. Standard Vectorization (General Archive Search)
        vector_store_service.create_and_store_embeddings_from_chunks(
            user_id, archive_item_id, case_id_str, doc_title,
            chunks, [base_metadata] * len(chunks)
        )

        # 2. Accountant Vectorization (Forensic Agent Memory)
        try:
            accountant_vector_service.store_finance_embeddings(
                user_id=user_id,
                document_id=archive_item_id,
                file_name=doc_title,
                chunks=chunks,
                metadatas=[base_metadata.copy() for _ in chunks]
            )
            logger.info(f"✅ Row-integrated document {archive_item_id} added to Accountant KB.")
        except Exception as acc_e:
            logger.error(f"⚠️ Accountant Ingestion Failed: {acc_e}")

        db_conn.archives.update_one({"_id": oid}, {"$set": {"indexing_status": "READY"}})
        publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "READY"})
        
        if len(raw_text) > 10000:
            analyze_document_deep_dive.delay(archive_item_id, raw_text[:50000])

    except Exception as e:
        error_message = str(e)
        db_conn.archives.update_one({"_id": ObjectId(archive_item_id)}, {"$set": {"indexing_status": "FAILED", "error_message": error_message}})
        if user_id: publish_sse_update(user_id, {"type": "DOCUMENT_STATUS", "document_id": archive_item_id, "status": "FAILED", "error": error_message})
        raise self.retry(exc=e)
    finally:
        if temp_file_path and os.path.exists(temp_file_path): os.remove(temp_file_path)


# --- TASK 2: HYDRA DEEP DIVE (Parallel Map-Reduce) ---
@celery_app.task(
    name="app.tasks.document_processing.analyze_document_deep_dive",
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 1, 'countdown': 30}
)
def analyze_document_deep_dive(self, archive_item_id: str, raw_text: Optional[str] = None):
    """
    Executes the 'Hydra Tactic': Parallel chunk analysis using asyncio loop inside Celery.
    """
    if db.db_instance is None: db.connect_to_mongo()
    db_conn = db.db_instance
    
    try:
        oid = ObjectId(archive_item_id)
        archive_item = db_conn.archives.find_one({"_id": oid})
        if not archive_item: return
        user_id = str(archive_item["user_id"])

        logger.info(f"🐉 Hydra Activated for Document: {archive_item.get('title')}")

        if not raw_text:
             logger.warning("No text provided for Hydra analysis. Aborting.")
             return

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        final_summary = loop.run_until_complete(
            document_service.analyze_document_parallel(raw_text, analysis_type="SUMMARY")
        )
        loop.close()

        db_conn.archives.update_one(
            {"_id": oid},
            {"$set": {
                "ai_summary": final_summary, 
                "analysis_timestamp": datetime.utcnow()
            }}
        )

        publish_sse_update(user_id, {
            "type": "DOCUMENT_ANALYSIS_COMPLETE",
            "document_id": archive_item_id,
            "summary": final_summary[:200] + "..."
        })
        logger.info(f"✅ Hydra Analysis Complete for {archive_item_id}")

    except Exception as e:
        logger.error(f"❌ Hydra Analysis Failed: {e}")
        pass


# --- TASK 3: SMART EXPENSE EXTRACTION (Text -> JSON) ---
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
        
        suffix = os.path.splitext(archive_item.get("title", ".tmp"))[1]
        temp_fd, temp_file_path = tempfile.mkstemp(suffix=suffix)
        file_stream = storage_service.get_file_stream(archive_item["storage_key"])
        with os.fdopen(temp_fd, 'wb') as temp_file: shutil.copyfileobj(file_stream, temp_file)
        if hasattr(file_stream, 'close'): file_stream.close()
        
        raw_text = text_extraction_service.extract_text(temp_file_path, archive_item.get("file_type", "").lower())
        if not raw_text or not raw_text.strip():
            raise ValueError("OCR failed or document is empty.")

        logger.info(f"🧠 Calling LLM to extract expense data from archive item {archive_item_id}")
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        extracted_data = loop.run_until_complete(llm_service.extract_expense_data(raw_text))
        loop.close()

        if not extracted_data or not extracted_data.get("total_amount"):
            raise ValueError("AI failed to extract required fields (total_amount) from the document.")

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