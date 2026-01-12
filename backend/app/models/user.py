# FILE: backend/app/models/user.py
# PHOENIX PROTOCOL - USER MODEL V5.5 (EMAIL INGEST)
# 1. ADDED: 'inbound_email_token' field to UserInDB.
# 2. PURPOSE: Stores a unique token to identify the user from automated email reports.

from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from .common import PyObjectId
import secrets # Used for token generation

# --- PHOENIX: PLAN CONFIGURATION ---
PLAN_LIMITS = {
    "SOLO": 1,       # Owner Only
    "STARTUP": 5,    # Owner + 4 Members
    "GROWTH": 10,    # Owner + 9 Members
    "ENTERPRISE": 50 # Large Teams
}

# Base User Model
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "STANDARD" 
    subscription_status: str = "TRIAL"
    status: str = "inactive"
    
    # --- MULTI-TENANT & PLAN FIELDS ---
    organization_id: Optional[PyObjectId] = Field(default=None, description="Reference to shared Organization ID")
    organization_role: str = Field(default="OWNER", description="Role: OWNER | MEMBER | VIEWER")
    organization_name: Optional[str] = None
    logo: Optional[str] = None 
    
    plan_tier: str = Field(default="SOLO", description="Subscription Tier: SOLO, STARTUP, GROWTH, ENTERPRISE")

# Model for creating a new user (Registration)
class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

# Model for updating user details
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    subscription_status: Optional[str] = None
    status: Optional[str] = None
    
    organization_id: Optional[PyObjectId] = None
    organization_role: Optional[str] = None
    organization_name: Optional[str] = None
    logo: Optional[str] = None
    plan_tier: Optional[str] = None

# Model stored in DB (includes hashed password)
class UserInDB(UserBase):
    id: PyObjectId = Field(alias="_id", default=None)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # PHOENIX: New field for the unique part of the inbound email address
    inbound_email_token: Optional[str] = Field(default_factory=lambda: secrets.token_urlsafe(16), description="Unique token for email-based data ingestion.")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

# Model for returning user data (Exclude password)
class UserOut(UserBase):
    id: PyObjectId = Field(alias="_id", serialization_alias="id")
    created_at: datetime
    last_login: Optional[datetime] = None
    
    # PHOENIX: Expose the token only to the user themselves
    inbound_email_token: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        arbitrary_types_allowed=True,
    )

# Model for Login Request
class UserLogin(BaseModel):
    username: str
    password: str