# FILE: backend/app/models/admin.py
# PHOENIX PROTOCOL - DATA MODEL RESILIENCE V2.1
# 1. FIX: 'plan_tier' unified with DB schema.
# 2. FEATURE: 'subscription_expiry_date' added to View and Update models.
# 3. INTELLIGENCE: Auto-mapping for plan field names.

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime
from bson import ObjectId

class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    subscription_status: Optional[str] = None
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    
    # PHOENIX FIX: Renamed to match DB field 'plan_tier'
    plan_tier: Optional[str] = None 
    
    # PHOENIX FIX: Added expiry date support
    subscription_expiry_date: Optional[datetime] = None

    # PHOENIX FIX: Force status to lowercase
    @field_validator('status')
    @classmethod
    def normalize_status(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.lower()
        return v

    # PHOENIX INTELLIGENCE: Catch mismatched frontend fields for Plan Tier
    @model_validator(mode='before')
    @classmethod
    def unify_plan_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # If 'plan_tier' is missing, check common alternatives and map them
            if not data.get('plan_tier'):
                if data.get('plan'):
                    data['plan_tier'] = data['plan']
                elif data.get('subscription_plan'):
                    data['plan_tier'] = data['subscription_plan']
                elif data.get('tier'):
                    data['plan_tier'] = data['tier']
        return data

class SubscriptionUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None
    subscription_status: Optional[str] = None
    plan_tier: Optional[str] = None
    subscription_expiry_date: Optional[datetime] = None
    admin_notes: Optional[str] = None
    email: Optional[EmailStr] = None

class UserAdminView(BaseModel):
    id: str = Field(..., alias='_id')
    username: str
    email: EmailStr
    role: str
    subscription_status: str
    
    # PHOENIX FIX: Added plan_tier so Admin can see the actual plan
    plan_tier: str = "SOLO" 
    
    # PHOENIX FIX: Added Expiry Date to View
    subscription_expiry_date: Optional[datetime] = None
    
    status: str = "inactive" 
    created_at: datetime
    last_login: Optional[datetime] = None
    case_count: int
    document_count: int

    @field_validator('id', mode='before')
    @classmethod
    def convert_objectid_to_str(cls, v: Any) -> str:
        if isinstance(v, ObjectId):
            return str(v)
        return v

    class Config:
        from_attributes = True
        populate_by_name = True 
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            ObjectId: lambda v: str(v), 
        }

class AdminUserOut(UserAdminView):
    pass