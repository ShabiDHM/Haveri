# FILE: backend/app/services/document_service.py
# PHOENIX PROTOCOL - DOCUMENT SERVICE V7.1 (HYDRA ENABLED)
# 1. NEW: Added 'analyze_document_parallel' using Map-Reduce pattern.
# 2. LOGIC: Calls 'llm_service.process_chunks_parallel' for high-speed processing.
# 3. SAFETY: Preserved all existing Delete/Create/Get logic exactly as is.

import logging
import datetime
import asyncio
from datetime import timezone
from typing import List, Optional, Tuple, Any, Dict
from bson import ObjectId
import redis
from fastapi import HTTPException
from pymongo.database import Database

from ..models.document import DocumentOut, DocumentStatus
from ..models.user import UserInDB

# Only essential services
from . import vector_store_service, storage_service, llm_service

logger = logging.getLogger(__name__)

# --- HYDRA TACTIC IMPLEMENTATION ---

async def analyze_document_parallel(text: str, analysis_type: str = "SUMMARY") -> str:
    """
    Orchestrates the Map-Reduce logic for large documents using the Hydra Tactic.
    
    1. MAP: Splits text into chunks and processes them in parallel via LLM Service.
    2. REDUCE: Combines partial results into a final cohesive analysis.
    """
    if not text:
        return ""

    # Define Prompts based on intent
    if analysis_type == "SUMMARY":
        map_prompt = "Summarize this specific section of the document in Albanian. Capture key dates, parties, and obligations."
        reduce_prompt = "Combine these partial summaries into one coherent, professional executive summary in Albanian."
    elif analysis_type == "ENTITIES":
        map_prompt = "Extract key entities (Names, Companies, Dates, Monetary Amounts) from this section. Return as bullet points."
        reduce_prompt = "Consolidate these lists of entities, removing duplicates and formatting cleanly."
    else:
        map_prompt = "Analyze this text segment for key business insights."
        reduce_prompt = "Synthesize these insights into a final report."

    # 1. MAP PHASE (Parallel Execution)
    # This calls the Async Hydra engine we built in llm_service
    partial_results = await llm_service.process_chunks_parallel(text, map_prompt)
    
    if not partial_results:
        return "Nuk u gjenerua analizë (Bosh)."

    # If document was small enough to fit in one chunk, return immediately
    if len(partial_results) == 1:
        return partial_results[0]

    # 2. REDUCE PHASE (Synthesis)
    combined_partials = "\n---\n".join(partial_results)
    final_summary = await llm_service.chat_completion(
        system_prompt=reduce_prompt,
        user_message=f"PARTIAL RESULTS:\n{combined_partials}"
    )
    
    return final_summary

# --- EXISTING CRUD LOGIC (PRESERVED) ---

def create_document_record(
    db: Database, owner: UserInDB, case_id: str, file_name: str, storage_key: str, mime_type: str
) -> DocumentOut:
    try:
        case_object_id = ObjectId(case_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Case ID format.")

    document_data = {
        "owner_id": owner.id, "case_id": case_object_id, "file_name": file_name,
        "storage_key": storage_key, "mime_type": mime_type,
        "status": DocumentStatus.PENDING,
        "created_at": datetime.datetime.now(timezone.utc),
        "preview_storage_key": None,
    }
    insert_result = db.documents.insert_one(document_data)
    if not insert_result.inserted_id:
        raise HTTPException(status_code=500, detail="Failed to create document record.")
    
    new_doc = db.documents.find_one({"_id": insert_result.inserted_id})
    return DocumentOut.model_validate(new_doc)

def finalize_document_processing(
    db: Database, redis_client: redis.Redis, doc_id_str: str,
    processed_text_storage_key: Optional[str] = None, summary: Optional[str] = None,
    preview_storage_key: Optional[str] = None
):
    try:
        doc_object_id = ObjectId(doc_id_str)
    except Exception:
        logger.error(f"Invalid Document ID received for finalization: {doc_id_str}")
        return

    update_fields = {"status": DocumentStatus.READY, "processed_timestamp": datetime.datetime.now(timezone.utc)}
    if processed_text_storage_key:
        update_fields["processed_text_storage_key"] = processed_text_storage_key
    if summary:
        update_fields["summary"] = summary
    if preview_storage_key:
        update_fields["preview_storage_key"] = preview_storage_key
        
    db.documents.update_one({"_id": doc_object_id}, {"$set": update_fields})

def get_documents_by_case_id(db: Database, case_id: str, owner: UserInDB) -> List[DocumentOut]:
    try:
        documents_cursor = db.documents.find({"case_id": ObjectId(case_id), "owner_id": owner.id}).sort("created_at", -1)
        documents = list(documents_cursor)
        return [DocumentOut.model_validate(doc) for doc in documents]
    except Exception as e:
        logger.error(f"Failed to fetch documents for case {case_id}: {e}")
        return []

def get_and_verify_document(db: Database, doc_id: str, owner: UserInDB) -> DocumentOut:
    try:
        doc_oid = ObjectId(doc_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Document ID.")
        
    document_data = db.documents.find_one({"_id": doc_oid, "owner_id": owner.id})
    if not document_data:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentOut.model_validate(document_data)

def get_preview_document_stream(db: Database, doc_id: str, owner: UserInDB) -> Tuple[Any, DocumentOut]:
    document = get_and_verify_document(db, doc_id, owner)
    
    if document.preview_storage_key:
        try:
            file_stream = storage_service.download_preview_document_stream(document.preview_storage_key)
            if file_stream:
                return file_stream, document
        except Exception:
            logger.warning(f"Preview key exists but fetch failed for {doc_id}, falling back to original.")

    if not document.storage_key:
        raise FileNotFoundError("Document content unavailable.")
        
    try:
        file_stream = storage_service.download_original_document_stream(document.storage_key)
        return file_stream, document
    except Exception as e:
        logger.error(f"Failed to download document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve the document.")

def get_original_document_stream(db: Database, doc_id: str, owner: UserInDB) -> Tuple[Any, DocumentOut]:
    document = get_and_verify_document(db, doc_id, owner)
    if not document.storage_key:
        raise HTTPException(status_code=404, detail="Original document file not found in storage.")
    try:
        file_stream = storage_service.download_original_document_stream(document.storage_key)
        if file_stream is None: raise FileNotFoundError
        return file_stream, document
    except Exception as e:
        logger.error(f"Failed to download original document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not retrieve the document file.")

def get_document_content_by_key(storage_key: str) -> Optional[str]:
    try:
        content_bytes = storage_service.download_processed_text(storage_key)
        return content_bytes.decode('utf-8') if content_bytes else None
    except Exception as e:
        logger.error(f"Failed to retrieve content: {e}", exc_info=True)
        return None

def delete_document_by_id(db: Database, redis_client: redis.Redis, doc_id: ObjectId, owner: UserInDB) -> List[str]:
    """
    SMART DELETE FUNCTION
    Removes: DB Record, S3 Files, Vector Embeddings (AI Memory).
    PRESERVES: Findings & Calendar Events (Extracted Intelligence).
    """
    document_to_delete = db.documents.find_one({"_id": doc_id, "owner_id": owner.id})
    if not document_to_delete:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    doc_id_str = str(doc_id)
    storage_key = document_to_delete.get("storage_key")
    processed_key = document_to_delete.get("processed_text_storage_key")
    preview_key = document_to_delete.get("preview_storage_key")

    try:
        vector_store_service.delete_document_embeddings(
            user_id=str(owner.id),
            document_id=doc_id_str
        )
    except Exception as e:
        logger.error(f"Vector store cleanup failed: {e}")
    
    if storage_key: 
        try: storage_service.delete_file(storage_key=storage_key)
        except: pass
    if processed_key: 
        try: storage_service.delete_file(storage_key=processed_key)
        except: pass
    if preview_key: 
        try: storage_service.delete_file(storage_key=preview_key)
        except: pass

    db.documents.delete_one({"_id": doc_id})
    
    return []

def bulk_delete_documents(db: Database, redis_client: redis.Redis, document_ids: List[str], owner: UserInDB) -> Dict[str, Any]:
    deleted_count = 0
    failed_count = 0
    all_deleted_finding_ids = []

    for doc_id_str in document_ids:
        try:
            if not ObjectId.is_valid(doc_id_str):
                continue
            
            doc_oid = ObjectId(doc_id_str)
            finding_ids = delete_document_by_id(db, redis_client, doc_oid, owner)
            all_deleted_finding_ids.extend(finding_ids)
            deleted_count += 1
        except Exception as e:
            logger.error(f"Bulk delete failed for {doc_id_str}: {e}")
            failed_count += 1
            
    return {
        "success": True,
        "deleted_count": deleted_count,
        "failed_count": failed_count,
        "deleted_finding_ids": all_deleted_finding_ids
    }