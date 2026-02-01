# FILE: backend/app/services/calendar_service.py
# PHOENIX PROTOCOL - INTELLIGENT BUSINESS CALENDAR V2.2 (SANITIZED)
# 1. FIX: Removed all markdown artifacts/citations from file footer.
# 2. STATUS: Pure Python syntax verified.

from typing import List, Optional, Tuple
from datetime import datetime, timezone, timedelta, date
from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.database import Database

try:
    import holidays
except ImportError:
    holidays = None

from app.models.calendar import (
    CalendarEventInDB, 
    CalendarEventCreate, 
    EventStatus, 
    EventType
)

class CalendarService:
    
    def __init__(self):
        self.xk_holidays = {}
        if holidays:
            try:
                self.xk_holidays = holidays.country_holidays("XK", observed=True)
            except Exception:
                self.xk_holidays = {}

    def _is_working_day(self, check_date: date) -> bool:
        if check_date.weekday() >= 5:
            return False
        if check_date in self.xk_holidays:
            return False
        return True

    def _get_next_working_day(self, original_dt: datetime) -> Tuple[datetime, str]:
        current_dt = original_dt
        reason = []
        
        for _ in range(30):
            check_date = current_dt.date()
            is_holiday = check_date in self.xk_holidays
            is_weekend = check_date.weekday() >= 5

            if not is_holiday and not is_weekend:
                break
            
            if not reason:
                if is_holiday:
                    name = self.xk_holidays.get(check_date, "Public Holiday")
                    reason.append(f"Holiday: {name}")
                elif is_weekend:
                    reason.append("Weekend")

            current_dt += timedelta(days=1)
        
        return current_dt, ", ".join(reason)

    def create_event(self, db: Database, event_data: CalendarEventCreate, user_id: ObjectId) -> CalendarEventInDB:
        if event_data.case_id:
            case = db.cases.find_one({
                "_id": ObjectId(event_data.case_id),
                "$or": [{"owner_id": user_id}, {"user_id": user_id}]
            })
            if not case:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Case not found or does not belong to the current user."
                )

        smart_types = [EventType.TAX_DEADLINE, EventType.PAYMENT_DUE]
        
        final_start_date = event_data.start_date
        final_end_date = event_data.end_date
        auto_note = ""

        if event_data.event_type in smart_types:
            adjusted_start, reason = self._get_next_working_day(final_start_date)
            
            if adjusted_start.date() != final_start_date.date():
                auto_note = f"\n[System]: Auto-Rescheduled from {final_start_date.date()} ({reason})."
                final_start_date = adjusted_start
                
                if final_end_date:
                    duration = final_end_date - event_data.start_date
                    final_end_date = final_start_date + duration

        event_dict = event_data.model_dump()
        event_dict["owner_id"] = user_id
        event_dict["start_date"] = final_start_date
        event_dict["end_date"] = final_end_date
        
        if auto_note:
            current_notes = event_dict.get("notes") or ""
            event_dict["notes"] = current_notes + auto_note

        if event_data.case_id:
            event_dict["case_id"] = str(event_data.case_id)
        else:
            event_dict["case_id"] = None
        
        now = datetime.now(timezone.utc)
        event_document = {
            **event_dict,
            "created_at": now,
            "updated_at": now,
            "status": EventStatus.PENDING
        }

        result = db.calendar_events.insert_one(event_document)
        created_event = db.calendar_events.find_one({"_id": result.inserted_id})
        
        if created_event:
            return CalendarEventInDB.model_validate(created_event)
        
        raise HTTPException(status_code=500, detail="Failed to retrieve created event.")

    def get_events_for_user(self, db: Database, user_id: ObjectId) -> List[CalendarEventInDB]:
        events_cursor = db.calendar_events.find({"owner_id": user_id}).sort("start_date", 1)
        return [CalendarEventInDB.model_validate(event_doc) for event_doc in events_cursor]

    def delete_event(self, db: Database, event_id: ObjectId, user_id: ObjectId) -> bool:
        delete_result = db.calendar_events.delete_one(
            {"_id": event_id, "owner_id": user_id}
        )
        if delete_result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Event not found.")
        return True

    def get_upcoming_alerts_count(self, db: Database, user_id: ObjectId, days: int = 7) -> int:
        now = datetime.now(timezone.utc)
        future = now + timedelta(days=days)
        
        query = {
            "owner_id": user_id,
            "status": EventStatus.PENDING,
            "start_date": {"$gte": now, "$lt": future}
        }
        
        return db.calendar_events.count_documents(query)

calendar_service = CalendarService()