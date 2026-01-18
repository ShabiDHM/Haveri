# FILE: backend/app/api/endpoints/calendar.py
# PHOENIX PROTOCOL - CALENDAR API V3.0 (SYNC ARCHITECTURE)
# 1. FIX: Converted endpoints to 'async def' with 'asyncio.to_thread'.
# 2. FIX: Replaced async DB dependencies with standard 'get_db'.
# 3. STATUS: Unified with project-wide synchronous architecture.

from fastapi import APIRouter, Depends, status, HTTPException, Response
from typing import List, Dict
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel
from pymongo.database import Database
import asyncio

from app.services.calendar_service import calendar_service
from app.models.calendar import CalendarEventOut, CalendarEventCreate
from app.api.endpoints.dependencies import get_current_user, get_db
from app.models.user import UserInDB

router = APIRouter(tags=["Calendar"])

class ShareUpdateRequest(BaseModel):
    is_public: bool

@router.get("/alerts", response_model=Dict[str, int])
async def get_alerts_count(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Returns the number of upcoming urgent events (next 7 days).
    """
    count = await asyncio.to_thread(calendar_service.get_upcoming_alerts_count, db=db, user_id=current_user.id)
    return {"count": count}

@router.post("/events", response_model=CalendarEventOut, status_code=status.HTTP_201_CREATED)
async def create_new_event(
    event_data: CalendarEventCreate,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Creates a new calendar event.
    """
    return await asyncio.to_thread(calendar_service.create_event, db=db, event_data=event_data, user_id=current_user.id)

@router.put("/events/{event_id}/share", status_code=status.HTTP_200_OK)
async def update_event_share_status(
    event_id: str,
    update_data: ShareUpdateRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """
    Toggles the public visibility of an existing calendar event.
    """
    try:
        object_id = ObjectId(event_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid event ID")

    collection = db["calendar_events"]

    event = await asyncio.to_thread(
        collection.find_one,
        {"_id": object_id, "user_id": current_user.id}
    )
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or permission denied.")

    result = await asyncio.to_thread(
        collection.update_one,
        {"_id": object_id},
        {"$set": {"is_public": update_data.is_public}}
    )

    if result.modified_count == 1:
        return {"status": "success", "is_public": update_data.is_public}
    
    return {"status": "no_change", "is_public": event.get("is_public", False)}

@router.get("/events", response_model=List[CalendarEventOut])
async def get_all_user_events(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    return await asyncio.to_thread(calendar_service.get_events_for_user, db=db, user_id=current_user.id)

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_event(
    event_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    try:
        object_id = ObjectId(event_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid event ID")
    
    await asyncio.to_thread(calendar_service.delete_event, db=db, event_id=object_id, user_id=current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)