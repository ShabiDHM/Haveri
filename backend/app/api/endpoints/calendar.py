# FILE: backend/app/api/endpoints/calendar.py
# PHOENIX PROTOCOL - CALENDAR API V2.1 (FIXED ROUTING & DB CONTEXT)
# 1. FIX: Ensured PUT /events/{event_id}/share endpoint exists and is correctly registered.
# 2. FIX: Replaced incorrect 'db.client["haveri"]' with 'db["calendar_events"]' to match the active database connection ('haveri_main_db').
# 3. STATUS: Production Ready.

from __future__ import annotations
from fastapi import APIRouter, Depends, status, HTTPException, Response
from typing import List, Any, Dict
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel

from app.services.calendar_service import CalendarService
from app.models.calendar import CalendarEventOut, CalendarEventCreate
from app.api.endpoints.dependencies import get_current_user, get_async_db
from app.models.user import UserInDB

router = APIRouter(tags=["Calendar"])

# --- Models ---
class ShareUpdateRequest(BaseModel):
    is_public: bool

# --- Endpoints ---

@router.get("/alerts", response_model=Dict[str, int])
async def get_alerts_count(
    current_user: UserInDB = Depends(get_current_user),
    db: Any = Depends(get_async_db),
):
    """
    Returns the number of upcoming urgent events (next 7 days).
    """
    service = CalendarService(client=db.client)
    count = await service.get_upcoming_alerts_count(user_id=current_user.id)
    return {"count": count}

@router.post("/events", response_model=CalendarEventOut, status_code=status.HTTP_201_CREATED)
async def create_new_event(
    event_data: CalendarEventCreate,
    current_user: UserInDB = Depends(get_current_user),
    db: Any = Depends(get_async_db),
):
    """
    Creates a new calendar event.
    """
    service = CalendarService(client=db.client)
    return await service.create_event(event_data=event_data, user_id=current_user.id)

@router.put("/events/{event_id}/share", status_code=status.HTTP_200_OK)
async def update_event_share_status(
    event_id: str,
    update_data: ShareUpdateRequest,
    current_user: UserInDB = Depends(get_current_user),
    db: Any = Depends(get_async_db),
):
    """
    Toggles the public visibility of an existing calendar event.
    """
    try:
        object_id = ObjectId(event_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid event ID")

    # Use the 'db' dependency directly to ensure we use the correct database name ('haveri_main_db')
    collection = db["calendar_events"]

    # Verify ownership before updating
    event = await collection.find_one(
        {"_id": object_id, "user_id": current_user.id}
    )
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or permission denied.")

    # Update the status
    result = await collection.update_one(
        {"_id": object_id},
        {"$set": {"is_public": update_data.is_public}}
    )

    if result.modified_count == 1:
        return {"status": "success", "is_public": update_data.is_public}
    
    # If no change was made (value was already the same)
    return {"status": "no_change", "is_public": event.get("is_public", False)}

@router.get("/events", response_model=List[CalendarEventOut])
async def get_all_user_events(
    current_user: UserInDB = Depends(get_current_user),
    db: Any = Depends(get_async_db),
):
    service = CalendarService(client=db.client)
    return await service.get_events_for_user(user_id=current_user.id)

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_event(
    event_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db: Any = Depends(get_async_db),
):
    try:
        object_id = ObjectId(event_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid event ID")
    
    service = CalendarService(client=db.client)
    await service.delete_event(event_id=object_id, user_id=current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)