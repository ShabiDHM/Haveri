# FILE: backend/app/tasks/drafting_tasks.py
# PHOENIX PROTOCOL - TARGETED FIX V2.1
# 1. FIX: Removed the non-existent 'context' and 'use_library' keyword arguments from the call to 'generate_draft_stream'.
# 2. STATUS: This resolves the Pylance 'reportCallIssue' errors and aligns the task with the current service layer contract.

import asyncio
from bson import ObjectId
import logging
from datetime import datetime
from typing import Optional

from ..celery_app import celery_app
from ..services import drafting_service
from ..core import db 
from ..models.user import UserInDB

logger = logging.getLogger(__name__)

def ensure_db_connection():
    """
    Ensures that the Celery worker has an active connection to Mongo.
    """
    if db.db_instance is None:
        logger.info("--- [Celery/Drafting] Initializing MongoDB Connection... ---")
        db.connect_to_mongo()

@celery_app.task(name="process_drafting_job", bind=True)
def process_drafting_job(
    self, 
    user_id: str, 
    case_id: Optional[str], 
    draft_type: Optional[str], 
    user_prompt: Optional[str],
    use_library: bool = False # This argument is received by the task but no longer used by the service.
):
    job_id = self.request.id
    logger.info(f"[JOB:{job_id}] Received drafting job for user {user_id}. Library Access: {use_library}")

    try:
        ensure_db_connection()
        
        user_doc = db.db_instance.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise Exception(f"User with ID {user_id} not found.")
        
        user = UserInDB(**user_doc)

        async def run_draft_generation():
            prompt = user_prompt or ""
            
            # PHOENIX FIX: Call the service with the correct arguments.
            stream_generator = drafting_service.generate_draft_stream(
                prompt_text=prompt,
                user=user,
                draft_type=draft_type,
                case_id=case_id,
                db=db.db_instance
            )
            return "".join([chunk async for chunk in stream_generator])

        logger.info(f"[JOB:{job_id}] Starting intelligent draft generation...")
        final_document_text = asyncio.run(run_draft_generation())
        
        result_document = {
            "job_id": job_id,
            "user_id": user_id,
            "case_id": case_id,
            "created_at": datetime.utcnow(),
            "status": "SUCCESS",
            "request_data": {
                "user_prompt": user_prompt, 
                "draft_type": draft_type,
                "use_library": use_library
            },
            "result_text": final_document_text
        }
        db.db_instance.drafting_results.insert_one(result_document)
        
        logger.info(f"[JOB:{job_id}] Drafting job finished and result stored successfully.")
        return {"status": "complete", "message": "Result stored in MongoDB."}

    except Exception as e:
        logger.error(f"[JOB:{job_id}] A critical error occurred during drafting: {e}", exc_info=True)
        ensure_db_connection()
        db.db_instance.drafting_results.update_one(
            {"job_id": job_id},
            {"$set": {"status": "FAILURE", "error_message": str(e), "finished_at": datetime.utcnow()}},
            upsert=True
        )
        raise