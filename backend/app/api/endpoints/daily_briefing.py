# FILE: backend/app/api/endpoints/daily_briefing.py
# PHOENIX PROTOCOL - API ENDPOINT V2.2 (CRASH FIX)
# 1. FIX: Replaced 'current_user.get()' with attribute access to support Pydantic models.
# 2. LOGIC: Safely extracts 'id' or '_id' to prevent AttributeError 500s.

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import get_async_db
from app.services.daily_briefing_service import DailyBriefingService
from app.api.endpoints.dependencies import get_current_user

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_daily_briefing(
    current_user: Any = Depends(get_current_user),
    db: Any = Depends(get_async_db)
):
    """
    Get the AI Agent Morning Report.
    """
    service = DailyBriefingService(db)
    
    # PHOENIX FIX: Safely extract ID from Pydantic Model OR Dictionary
    # This prevents 'AttributeError: object has no attribute get'
    try:
        if hasattr(current_user, "id"):
            user_id = str(current_user.id)
        elif hasattr(current_user, "_id"):
            user_id = str(current_user._id)
        elif isinstance(current_user, dict):
            user_id = str(current_user.get("id") or current_user.get("_id"))
        else:
            raise ValueError("Could not determine user ID")
    except Exception as e:
        print(f"User ID Extraction Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User identity could not be verified."
        )
    
    try:
        report = await service.generate_morning_report(user_id)
        return report
    except Exception as e:
        print(f"Briefing Generation Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate daily briefing."
        )