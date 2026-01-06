# FILE: backend/app/models/archive.py
# PHOENIX PROTOCOL - DATA MODEL FIX V3.2
# 1. SYNTAX FIX: Corrected the 'model_config' to use a dictionary literal, resolving the Pylance error.
# 2. SERIALIZATION FIX: Implemented a robust Pydantic v2 'field_serializer' to guarantee all ObjectId fields
#    (id, user_id, parent_id, case_id) are converted to strings in the JSON output.
# 3. STATUS: This is the definitive fix. It corrects the backend data model to provide the frontend with a clean, reliable data structure.

from pydantic import BaseModel, Field, ConfigDict, field_serializer
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
    # This correctly reads `_id` from MongoDB into the `id` attribute upon initialization.
    id: PyObjectId = Field(alias="_id", default=None)
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_shared: bool = False
    indexing_status: str = Field(default="PENDING")

    # PHOENIX SYNTAX FIX: Use a dictionary literal for model_config.
    model_config: ConfigDict = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }

class ArchiveItemOut(ArchiveItemInDB):
    # This model inherits the 'id' field, which is correctly populated from '_id'.
    # The task now is to ensure it, and all other ObjectIds, are serialized as strings.

    # PHOENIX SERIALIZATION FIX: This serializer runs when creating JSON.
    # It finds the specified fields and ensures their values are converted to strings.
    @field_serializer('id', 'user_id', 'parent_id', 'case_id', when_used='json')
    def serialize_object_ids_to_str(self, v: Optional[PyObjectId]) -> Optional[str]:
        if v is None:
            return None
        return str(v)