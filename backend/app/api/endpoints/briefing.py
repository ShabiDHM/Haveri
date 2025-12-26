# FILE: backend/app/api/endpoints/briefing.py
# PHOENIX PROTOCOL - STRATEGIC BRIEFING ROUTER V1.0
# 1. ENDPOINT: Exposes the new generative briefing service at /briefing/strategic.

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import get_async_db
from app.services.strategic_briefing_service import StrategicBriefingService
from app.api.endpoints.dependencies import get_current_user
from app.models.user import UserInDB

router = APIRouter()

@router.get("/strategic", status_code=status.HTTP_200_OK)
async def get_strategic_briefing(
    current_user: UserInDB = Depends(get_current_user),
    db: Any = Depends(get_async_db)
):
    """
    Get the AI-generated Strategic Daily Briefing.
    """
    if not current_user or not current_user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="User identity could not be verified."
        )

    try:
        service = StrategicBriefingService(db, str(current_user.id))
        report = await service.generate_strategic_briefing()
        return report
    except Exception as e:
        print(f"Strategic Briefing Generation Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate strategic briefing."
        )