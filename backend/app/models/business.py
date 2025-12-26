# FILE: backend/app/models/business.py
# PHOENIX PROTOCOL - BUSINESS ENTITY V17.0 (FISCAL UPGRADE)
# 1. ADDED: vat_rate, target_margin, currency.
# 2. RESULT: Database now natively stores fiscal intelligence settings.

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from .common import PyObjectId

class BusinessProfileBase(BaseModel):
    firm_name: str = "Zyra Ligjore"
    address: Optional[str] = None
    city: Optional[str] = "Prishtina"
    phone: Optional[str] = None
    email_public: Optional[str] = None
    website: Optional[str] = None
    tax_id: Optional[str] = None 
    branding_color: str = "#1f2937"
    
    # PHOENIX: Fiscal Configuration for BI Module
    vat_rate: float = 18.0
    target_margin: float = 30.0
    currency: str = "EUR"

class BusinessProfileUpdate(BusinessProfileBase):
    """
    Schema for updating profile details.
    """
    pass

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