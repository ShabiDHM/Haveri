# FILE: backend/app/api/endpoints/daily_briefing.py
# PHOENIX PROTOCOL - API ENDPOINT V2.1 (PATH CORRECTION)
# 1. FIX: Corrected import path for 'get_current_user' to 'app.api.endpoints.dependencies'.
# 2. INTEGRITY: Retained 'Any' type hints for database stability.

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import get_async_db
from app.services.daily_briefing_service import DailyBriefingService

# PHOENIX FIX: Pointing to the correct location of dependencies.py
from app.api.endpoints.dependencies import get_current_user

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def get_daily_briefing(
    current_user: dict = Depends(get_current_user),
    db: Any = Depends(get_async_db)
):
    """
    Get the AI Agent Morning Report.
    """
    service = DailyBriefingService(db)
    
    # Handle both str and ObjectId for user_id to ensure compatibility
    user_id = str(current_user.get("_id") or current_user.get("id"))
    
    try:
        report = await service.generate_morning_report(user_id)
        return report
    except Exception as e:
        print(f"Briefing Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate daily briefing."
        )