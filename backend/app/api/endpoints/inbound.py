# FILE: backend/app/api/endpoints/inbound.py
# PHOENIX PROTOCOL - INBOUND EMAIL WEBHOOK V1.0
# 1. FEATURE: A new, unauthenticated endpoint for receiving parsed emails from a service like SendGrid.
# 2. LOGIC: It receives form data, hands it off to the InboundService for processing.

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile
from pymongo.database import Database
from app.api.endpoints.dependencies import get_db
from app.services.inbound_service import InboundService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/email-webhook", status_code=status.HTTP_202_ACCEPTED)
async def handle_inbound_email(
    db: Database = Depends(get_db),
    to: str = Form(...),
    attachment1: UploadFile = Form(None),
    **kwargs
):
    """
    Handles inbound emails parsed by a service like SendGrid.
    The 'to' address format is expected to be 'token@in.haveri.tech'.
    """
    logger.info(f"Inbound email received for: {to}")
    
    inbound_service = InboundService(db)
    
    if not attachment1:
        logger.warning(f"No attachment found in email to {to}.")
        # Still return 202 so the mail service doesn't retry.
        return {"status": "accepted", "detail": "No attachment found to process."}

    try:
        # The service will handle finding the user and processing the file
        result = await inbound_service.process_inbound_attachment(to_address=to, file=attachment1)
        return {"status": "processed", "result": result}
    except HTTPException as e:
        # Re-raise HTTP exceptions to send proper error codes
        raise e
    except Exception as e:
        logger.error(f"Failed to process inbound email for {to}: {e}", exc_info=True)
        # We don't want the mail service to retry, so we accept the request but log the failure.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error while processing the attachment.")