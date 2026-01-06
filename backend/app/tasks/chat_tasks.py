# FILE: backend/app/tasks/chat_tasks.py
# PHOENIX PROTOCOL - TARGETED FIX V2.1
# 1. FIX: Corrected the function call in 'ensure_async_db_connection' from the non-existent 'connect_to_mongo_async'
#    to the correct function name 'connect_to_motor' as defined in core/db.py.
# 2. STATUS: This resolves the Pylance 'reportAttributeAccessIssue' and allows the task to connect to the database.

import asyncio
import logging
import httpx
from datetime import datetime, timezone

from ..celery_app import celery_app
from ..services import chat_service
from ..core import db

logger = logging.getLogger(__name__)

BROADCAST_ENDPOINT = "http://backend:8000/internal/broadcast/document-update"

async def ensure_async_db_connection():
    """
    Ensures the Celery worker has an active ASYNC (Motor) connection.
    """
    if db.async_db_instance is None:
        logger.info("--- [Celery/Chat] Initializing Async (Motor) MongoDB Connection... ---")
        # PHOENIX FIX: Corrected function name
        await db.connect_to_motor()

@celery_app.task(name="process_socratic_query_task")
def process_socratic_query_task(query_text: str, case_id: str, user_id: str):
    """
    This background task runs the full RAG pipeline and sends the final result back
    via a WebSocket broadcast by calling the internal broadcast API.
    """
    logger.info(f"Celery task 'process_socratic_query_task' started for user {user_id} in case {case_id}")
    
    async def _run_async_logic():
        broadcast_payload = {}
        try:
            await ensure_async_db_connection()
            
            full_response = await chat_service.get_http_chat_response(
                db=db.async_db_instance,
                case_id=case_id,
                user_query=query_text,
                user_id=user_id
            )
            
            broadcast_payload = {
                "case_id": case_id,
                "type": "chat_message_out",
                "text": full_response,
                "sender": "AI",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        except Exception as e:
            logger.error(f"Celery task failed during RAG pipeline for user {user_id} in case {case_id}: {e}", exc_info=True)
            broadcast_payload = {
                "case_id": case_id,
                "type": "chat_message_out",
                "text": "Ndodhi një gabim gjatë përpunimit të pyetjes suaj. Ju lutem provoni përsëri.",
                "sender": "AI",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        
        return broadcast_payload

    final_payload = asyncio.run(_run_async_logic())

    try:
        with httpx.Client() as client:
            response = client.post(BROADCAST_ENDPOINT, json=final_payload)
            response.raise_for_status()
        
        logger.info(f"Celery task successfully triggered broadcast for user {user_id} in case {case_id}")

    except httpx.HTTPStatusError as e:
        logger.error(f"Celery task failed to broadcast chat response via HTTP. Status: {e.response.status_code}, Response: {e.response.text}",
                     extra={"payload": final_payload})
    except Exception as e:
        logger.error(f"Celery task failed during HTTP broadcast of chat message: {e}", exc_info=True)