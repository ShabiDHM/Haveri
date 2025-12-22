# FILE: backend/app/tasks/document_processing.py
# PHOENIX PROTOCOL - CELERY CONNECTION FIX V2.1 (PYLANCE COMPLIANCE)
# 1. FIX: Changed 'if db.db_instance:' to 'if db.db_instance is not None:' to avoid Pymongo bool error.
# 2. STATUS: Fully type-safe and crash-proof.

from celery import shared_task
import structlog
import time
import json
from bson import ObjectId
from typing import Optional
from redis import Redis 

# PHOENIX FIX: Import the module, not the variables, to access dynamic state
from app.core import db 
from app.core.config import settings 
from app.services import document_processing_service
from app.services.document_processing_service import DocumentNotFoundInDBError
from app.models.document import DocumentStatus

logger = structlog.get_logger(__name__)

def ensure_db_connection():
    """
    Ensures that the Celery worker has active connections to Mongo and Redis.
    This is required because workers do not run the FastAPI lifespan events.
    """
    if db.db_instance is None:
        logger.info("--- [Celery] Initializing MongoDB Connection... ---")
        db.connect_to_mongo()
        
    if db.redis_sync_client is None:
        logger.info("--- [Celery] Initializing Redis Connection... ---")
        db.connect_to_redis()

def publish_sse_update(document_id: str, status: str, error: Optional[str] = None):
    """
    Helper to publish status updates to Redis for SSE.
    Uses a fresh connection to ensure reliability in Celery workers.
    """
    ensure_db_connection() # Ensure DB is ready for queries inside this helper
    
    redis_client = None
    try:
        # 1. Establish a FRESH connection for publishing
        redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

        # 2. Get User ID (Dynamic access via db.db_instance)
        # Explicit None check for safety
        if db.db_instance is not None:
            doc = db.db_instance.documents.find_one({"_id": ObjectId(document_id)})
            if not doc:
                logger.warning("sse.doc_not_found", document_id=document_id)
                return
            
            user_id = str(doc.get("owner_id"))
            if not user_id or user_id == "None":
                user_id = str(doc.get("user_id"))

            # 3. Construct Payload
            payload = {
                "type": "DOCUMENT_STATUS",
                "document_id": document_id,
                "status": status,
                "error": error
            }
            
            # 4. Publish
            channel = f"user:{user_id}:updates"
            redis_client.publish(channel, json.dumps(payload))
            
            logger.info(f"🚀 SSE PUBLISHED: {channel} -> {status}")
        else:
            logger.error("sse.publish_failed: DB instance is None")
        
    except Exception as e:
        logger.error("sse.publish_failed", error=str(e))
    finally:
        if redis_client:
            redis_client.close()

@shared_task(
    bind=True,
    name='process_document_task',
    autoretry_for=(DocumentNotFoundInDBError,),
    retry_kwargs={'max_retries': 5, 'countdown': 10},
    default_retry_delay=10
)
def process_document_task(self, document_id_str: str):
    log = logger.bind(document_id=document_id_str, task_id=self.request.id)
    log.info("task.received", attempt=self.request.retries)

    # PHOENIX FIX: Lazy Initialization
    # This guarantees 'db.db_instance' is not None before we pass it
    ensure_db_connection()

    if self.request.retries == 0:
        time.sleep(2) 

    try:
        document_processing_service.orchestrate_document_processing_mongo(
            db=db.db_instance, # Dynamic access
            redis_client=db.redis_sync_client, # Dynamic access
            document_id_str=document_id_str
        )
        log.info("task.completed.success")
        
        publish_sse_update(document_id_str, DocumentStatus.READY)

    except DocumentNotFoundInDBError as e:
        log.warning("task.retrying.doc_not_found", error=str(e))
        raise self.retry(exc=e)

    except Exception as e:
        log.error("task.failed.generic", error=str(e), exc_info=True)
        
        try:
            # Safe DB access on failure - PHOENIX FIX: Explicit is not None check
            if db.db_instance is not None:
                db.db_instance.documents.update_one(
                    {"_id": ObjectId(document_id_str)},
                    {"$set": {"status": DocumentStatus.FAILED, "error_message": str(e)}}
                )
            
            publish_sse_update(document_id_str, DocumentStatus.FAILED, str(e))
            
        except Exception as db_fail_e:
             log.critical("task.CRITICAL_DB_FAILURE_ON_FAIL", error=str(db_fail_e))
        raise e