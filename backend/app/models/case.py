# FILE: backend/app/models/case.py
# PHOENIX PROTOCOL - CASE MODEL V3.0 (BUSINESS CLEANUP)
# 1. REMOVED: Deleted legacy litigation fields (court_name, judge_name, opponent_name).
# 2. REMOVED: Deleted 'finding_count' as forensic analysis is deprecated.
# 3. STATUS: Clean, business-focused data model.

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common import PyObjectId

# Sub-model for embedded client details
class ClientData(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

# Chat Message Model
class ChatMessage(BaseModel):
    role: str 
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Base Case Model
class CaseBase(BaseModel):
    case_number: Optional[str] = None 
    title: str
    case_name: Optional[str] = None
    description: Optional[str] = None
    status: str = "OPEN"
    client_id: Optional[PyObjectId] = None 
    
    # PHOENIX: Removed court_name, judge_name, opponent_name

# Create - Accepts Form Data
class CaseCreate(CaseBase):
    clientName: Optional[str] = None
    clientEmail: Optional[str] = None
    clientPhone: Optional[str] = None

# Update
class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    client: Optional[ClientData] = None

# DB Model
class CaseInDB(CaseBase):
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: PyObjectId 
    client: Optional[ClientData] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    chat_history: List[Dict[str, Any]] = []

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

# Return Model - Matches Frontend 'Case' Interface
class CaseOut(CaseBase):
    id: PyObjectId = Field(alias="_id", serialization_alias="id")
    created_at: datetime
    updated_at: datetime
    
    client: Optional[ClientData] = None
    chat_history: Optional[List[ChatMessage]] = []

    document_count: int = 0
    alert_count: int = 0
    event_count: int = 0
    # PHOENIX: Removed finding_count

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True,
    )