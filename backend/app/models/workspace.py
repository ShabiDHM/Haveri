# FILE: backend/app/models/workspace.py
# PHOENIX PROTOCOL - WORKSPACE MODEL V4.1 (CONFIG FIX)
# 1. FIXED: Enabled 'populate_by_name' to allow initialization using Python field names.
# 2. STATUS: Build-ready.

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from .common import PyObjectId

class WorkspaceClientData(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class WorkspaceBase(BaseModel):
    # PHOENIX: Allow using 'workspace_number' in code, saves as 'case_number' in DB
    workspace_number: Optional[str] = Field(None, alias="case_number")
    title: str = "Hapësira Ime"
    workspace_name: Optional[str] = Field(None, alias="case_name")
    description: Optional[str] = None
    status: str = "ACTIVE"
    client_id: Optional[PyObjectId] = None 

    model_config = ConfigDict(
        populate_by_name=True, # PHOENIX: This is the fix for line 80
        arbitrary_types_allowed=True
    )

class WorkspaceCreate(WorkspaceBase):
    clientName: Optional[str] = None
    clientEmail: Optional[str] = None
    clientPhone: Optional[str] = None

class WorkspaceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    client: Optional[WorkspaceClientData] = None

class WorkspaceInDB(WorkspaceBase):
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: PyObjectId 
    client: Optional[WorkspaceClientData] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class WorkspaceOut(WorkspaceBase):
    id: PyObjectId = Field(alias="_id", serialization_alias="id")
    created_at: datetime
    updated_at: datetime
    client: Optional[WorkspaceClientData] = None
    document_count: int = 0
    alert_count: int = 0
    event_count: int = 0

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True,
    )