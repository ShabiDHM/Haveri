# FILE: backend/app/models/archive.py
# PHOENIX PROTOCOL - ARCHIVE V3.0 (STATUS TRACKING)
# 1. ADDED: 'indexing_status' field to ArchiveItemInDB and ArchiveItemOut.
# 2. EFFECT: This allows the AI processing status (PENDING, PROCESSING, READY) to be sent to the frontend.

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from .common import PyObjectId

class ArchiveItemBase(BaseModel):
    title: str
    item_type: str = "FILE" 
    parent_id: Optional[PyObjectId] = None 
    
    file_type: str = "PDF"
    category: str = "GENERAL" 
    storage_key: Optional[str] = None
    file_size: int = 0
    description: str = ""
    
    case_id: Optional[PyObjectId] = None 

class ArchiveItemCreate(ArchiveItemBase):
    pass

class ArchiveItemInDB(ArchiveItemBase):
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_shared: bool = False
    
    # PHOENIX: Added status field
    indexing_status: str = Field(default="PENDING")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class ArchiveItemOut(ArchiveItemInDB):
    id: PyObjectId = Field(alias="_id", serialization_alias="id", default=None)
    case_id: Optional[PyObjectId] = Field(default=None)
    parent_id: Optional[PyObjectId] = Field(default=None)
    is_shared: bool = False
    
    # PHOENIX: Expose status to the frontend
    indexing_status: str = Field(default="PENDING")