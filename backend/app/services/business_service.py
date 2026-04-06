# FILE: backend/app/services/business_service.py
# PHOENIX PROTOCOL - BUSINESS SERVICE V2.2 (FIXED ZERO VALUE HANDLING)

import structlog
import mimetypes
from typing import Tuple, Any
from datetime import datetime, timezone
from bson import ObjectId
from pymongo.database import Database
from fastapi import UploadFile, HTTPException

from ..models.business import BusinessProfileUpdate, BusinessProfileInDB
from ..models.common import PyObjectId
from ..services import storage_service

logger = structlog.get_logger(__name__)

class BusinessService:
    def __init__(self, db: Database):
        self.db = db

    def get_or_create_profile(self, user_id: str) -> BusinessProfileInDB:
        profile = self.db.business_profiles.find_one({"user_id": ObjectId(user_id)})
        
        if not profile:
            logger.info("business.profile_created", user_id=user_id)
            new_profile = {
                "user_id": ObjectId(user_id),
                "firm_name": "Zyra Ligjore",
                "branding_color": "#1f2937",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            self.db.business_profiles.insert_one(new_profile)
            return BusinessProfileInDB(**new_profile)
        
        return BusinessProfileInDB(**profile)

    def update_profile(self, user_id: str, data: BusinessProfileUpdate) -> BusinessProfileInDB:
        current_profile = self.get_or_create_profile(user_id)
        
        # CRITICAL FIX: Use exclude_none=True instead of exclude_unset=True
        # This allows 0 values to be saved (exclude_unset would exclude 0 because
        # it treats 0 as "unset" in some cases, but we want to allow 0% VAT)
        # exclude_none=True only excludes actual None values, preserving 0
        update_data = data.model_dump(exclude_none=True)
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Log the update for debugging
        logger.info("business.profile_update", user_id=user_id, update_fields=list(update_data.keys()))
        
        result = self.db.business_profiles.find_one_and_update(
            {"_id": ObjectId(current_profile.id)},
            {"$set": update_data},
            return_document=True
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Profile not found after update.")
            
        return BusinessProfileInDB(**result)

    def update_logo(self, user_id: str, file: UploadFile) -> BusinessProfileInDB:
        current_profile = self.get_or_create_profile(user_id)
        
        if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(400, "Format i pavlefshëm. Lejohen vetëm PNG, JPG, WEBP.")
        
        try:
            storage_key = storage_service.upload_file_raw(
                file=file,
                folder=f"{user_id}/branding"
            )
            
            logo_url = f"business/logo/{user_id}?ts={int(datetime.now().timestamp())}"
            
            result = self.db.business_profiles.find_one_and_update(
                {"_id": ObjectId(current_profile.id)},
                {
                    "$set": {
                        "logo_storage_key": storage_key,
                        "logo_url": logo_url,
                        "updated_at": datetime.now(timezone.utc)
                    }
                },
                return_document=True
            )
            
            return BusinessProfileInDB(**result)
            
        except Exception as e:
            logger.error("business.logo_upload_failed", error=str(e))
            raise HTTPException(500, "Ngarkimi i logos dështoi.")

    def get_logo_stream(self, user_id: str) -> Tuple[Any, str]:
        profile = self.db.business_profiles.find_one({"user_id": ObjectId(user_id)})
        
        if not profile or "logo_storage_key" not in profile:
            raise HTTPException(status_code=404, detail="Logo not found")
        
        key = profile["logo_storage_key"]
        
        try:
            stream = storage_service.get_file_stream(key)
            mime_type, _ = mimetypes.guess_type(key)
            return stream, mime_type or "image/png"
        except Exception as e:
            logger.error(f"Failed to stream logo for {user_id}: {e}")
            raise HTTPException(status_code=404, detail="Logo file missing")