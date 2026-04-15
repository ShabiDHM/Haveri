# FILE: backend/app/models/business.py
# PHOENIX PROTOCOL - BUSINESS ENTITY V18.1 (STRICT VALIDATION FOR 0 VALUES)

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from ..models.common import PyObjectId

class BusinessProfileBase(BaseModel):
    firm_name: str = "Zyra Ligjore"
    address: Optional[str] = None
    city: Optional[str] = "Prishtina"
    phone: Optional[str] = None
    email_public: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None 
    branding_color: str = "#1f2937"
    
    # PHOENIX: Fiscal Configuration
    vat_rate: float = 18.0
    target_margin: float = 30.0
    currency: str = "EUR"

class BusinessProfileUpdate(BaseModel):
    """
    Schema for updating profile details. 
    Added ge=0 to ensure 0 is accepted as a valid number and not filtered out.
    """
    firm_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email_public: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None
    branding_color: Optional[str] = None
    vat_rate: Optional[float] = Field(default=None, ge=0)
    target_margin: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = None

class BusinessProfileInDB(BusinessProfileBase):
    """
    Schema for the Database Record.
    """
    id: PyObjectId = Field(alias="_id")
    user_id: PyObjectId
    
    logo_storage_key: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

class BusinessProfileOut(BusinessProfileBase):
    id: str
    logo_url: Optional[str] = None
    is_complete: bool = False