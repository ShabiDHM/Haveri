# FILE: backend/app/tasks/deadline_extraction.py
# PHOENIX PROTOCOL - CELERY FIX V2.0
# 1. REGISTRATION FIX: Replaced '@shared_task' with '@celery_app.task' to ensure the task is discoverable by the worker.
# 2. DB CONNECTION FIX: Implemented the standard 'ensure_db_connection' pattern to prevent crashes caused by a null DB instance.

import structlog
import logging
# PHOENIX FIX: Import the explicit Celery app instance and dynamic db module
from app.celery_app import celery_app
from app.core import db
from app.services import deadline_service

logger = structlog.get_logger(__name__)

# PHOENIX FIX: Standard helper to initialize DB connection inside the worker
def ensure_db_connection():
    """
    Ensures that the Celery worker has an active connection to Mongo.
    This is required because workers do not run the FastAPI lifespan events.
    """
    if db.db_instance is None:
        logger.info("--- [Celery/Deadline] Initializing MongoDB Connection... ---")
        db.connect_to_mongo()

# PHOENIX FIX: Use the correct decorator to register the task
@celery_app.task(name="extract_deadlines_from_document")
def extract_deadlines_from_document(document_id: str, text_content: str):
    """
    Celery task wrapper for deadline extraction.
    """
    logger.info("task.deadline_extraction.started", document_id=document_id)
    
    try:
        # PHOENIX FIX: Ensure the DB connection is live before using it
        ensure_db_connection()
        
        deadline_service.extract_and_save_deadlines(
            db=db.db_instance, # PHOENIX FIX: Use the dynamic db_instance
            document_id=document_id,
            full_text=text_content
        )
        logger.info("task.deadline_extraction.success", document_id=document_id)
    except Exception as e:
        logger.error("task.deadline_extraction.failed", error=str(e), document_id=document_id)
        # Exception is caught to prevent crashing the main document processing flow.