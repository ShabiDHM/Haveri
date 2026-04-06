# FILE: backend/app/api/endpoints/calendar.py
# PHOENIX PROTOCOL - CALENDAR API V3.1 (DEBUG ENDPOINT ADDED)

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


# ========== DEBUG ENDPOINT ==========
@router.get("/debug/check-events")
async def debug_check_events(
    current_user: UserInDB = Depends(get_current_user),
    db: Database = Depends(get_db)
):
    """
    DEBUG: Check all calendar events for the current user.
    This helps diagnose why events aren't showing in the agenda.
    """
    from bson import ObjectId
    
    # Query with ObjectId owner_id
    events_with_objectid = await asyncio.to_thread(
        list,
        db.calendar_events.find({"owner_id": current_user.id})
    )
    
    # Query with string owner_id (just in case)
    events_with_string = await asyncio.to_thread(
        list,
        db.calendar_events.find({"owner_id": str(current_user.id)})
    )
    
    # Get all events without filter (to see if any exist at all)
    all_events = await asyncio.to_thread(list, db.calendar_events.find({}))
    
    # Get one sample event to see structure
    sample = await asyncio.to_thread(db.calendar_events.find_one, {})
    
    return {
        "user_id": str(current_user.id),
        "user_id_as_objectid": str(current_user.id),
        "events_with_owner_id_objectid": len(events_with_objectid),
        "events_with_owner_id_string": len(events_with_string),
        "total_events_in_collection": len(all_events),
        "sample_event": {
            "id": str(sample.get("_id")) if sample else None,
            "owner_id": str(sample.get("owner_id")) if sample else None,
            "title": sample.get("title") if sample else None,
            "start_date": str(sample.get("start_date")) if sample else None,
            "event_type": sample.get("event_type") if sample else None,
        } if sample else None,
        "first_5_events": [
            {
                "id": str(e.get("_id")),
                "owner_id": str(e.get("owner_id")) if e.get("owner_id") else None,
                "owner_id_type": type(e.get("owner_id")).__name__ if e.get("owner_id") else None,
                "title": e.get("title"),
                "start_date": str(e.get("start_date")) if e.get("start_date") else None,
            }
            for e in all_events[:5]
        ]
    }