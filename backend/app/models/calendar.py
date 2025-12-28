# FILE: backend/app/models/calendar.py
# PHOENIX PROTOCOL - BUSINESS MODEL ALIGNMENT V2
# 1. REFACTOR: Replaced the 'EventType' Enum with business-centric types (APPOINTMENT, TASK, etc.).
# 2. DEFAULT: Changed the default event_type to 'TASK'.
# 3. STATUS: Backend validation is now fully synchronized with the frontend Business Calendar Model.

from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId

from app.models.common import PyObjectId 

# PHOENIX: Refactored Enum to match the Business Model
class EventType(str, Enum):
    APPOINTMENT = "APPOINTMENT"
    TASK = "TASK"
    PAYMENT_DUE = "PAYMENT_DUE"
    TAX_DEADLINE = "TAX_DEADLINE"
    PERSONAL = "PERSONAL"
    OTHER = "OTHER"

class EventPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class EventStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class CalendarEventBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    start_date: datetime
    end_date: Optional[datetime] = None
    is_all_day: bool = False
    event_type: EventType = EventType.TASK # PHOENIX: Changed default to a more neutral business type
    priority: EventPriority = EventPriority.MEDIUM
    location: Optional[str] = Field(None, max_length=100)
    attendees: Optional[List[str]] = None
    notes: Optional[str] = Field(None, max_length=1000)

class CalendarEventCreate(CalendarEventBase):
    case_id: Optional[PyObjectId] = None # Optional for non-case related tasks

    @field_validator('case_id', mode='before')
    @classmethod
    def validate_case_id(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            if not v.strip(): return None # Allow empty string
            try:
                return ObjectId(v)
            except Exception:
                raise ValueError(f"Invalid ObjectId string: {v}")
        elif isinstance(v, ObjectId):
            return v
        else:
            raise ValueError(f"Expected string or ObjectId, got {type(v)}")

class CalendarEventInDB(CalendarEventBase):
    id: PyObjectId = Field(alias="_id")
    owner_id: PyObjectId
    case_id: Optional[str] = None # Optional to allow general business events
    document_id: Optional[str] = None
    status: EventStatus = EventStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(populate_by_name=True)

class CalendarEventOut(CalendarEventInDB):
    # This model is sent to the frontend. Ensure fields are what frontend expects.
    # The 'id' field will be serialized from the PyObjectId aliased from '_id'.
    pass