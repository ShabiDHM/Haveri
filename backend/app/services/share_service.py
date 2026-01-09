# FILE: backend/app/services/share_service.py
# PHOENIX PROTOCOL - SHARE SERVICE V1.7 (EXTENDED PROFILE DATA)
# 1. FEATURE: Extended 'get_public_case_data' to return full Business Profile details.
#    - Added: address, city, phone, email, website, tax_id (nui).
# 2. UI SYNC: This enables the frontend Client Portal to display the full contact info of the Law Firm.

from pymongo.database import Database
from typing import Dict, Any, List, Optional
from bson import ObjectId

class ShareService:
    def __init__(self, db: Database):
        self.db = db

    def get_public_case_data(self, case_id: str) -> Dict[str, Any]:
        """
        Aggregates all public-facing data for a given case.
        This is the single source of truth for the Client Portal.
        """
        if not ObjectId.is_valid(case_id):
            return {}
        
        case_oid = ObjectId(case_id)
        
        case_doc = self.db["cases"].find_one({"_id": case_oid})
        
        if not case_doc:
            return {}

        owner_id = case_doc.get("owner_id") or case_doc.get("user_id")
        if not owner_id:
            return {} 

        # 1. Resolve Owner Profile
        business_profile: Optional[Dict[str, Any]] = self.db["business_profiles"].find_one({"user_id": str(owner_id)})
        if not business_profile and isinstance(owner_id, ObjectId):
             business_profile = self.db["business_profiles"].find_one({"user_id": owner_id})

        # 2. Get Fallback User Info
        user_doc = self.db["users"].find_one({"_id": ObjectId(str(owner_id))})
        
        # 3. Determine Display Name & Base Info
        org_name = "Zyra Ligjore"
        if business_profile and business_profile.get("firm_name"):
            org_name = business_profile.get("firm_name")
        elif user_doc and user_doc.get("full_name"):
            org_name = user_doc.get("full_name")

        # 4. Determine Logo URL
        logo_url = None
        if business_profile and business_profile.get("logo_storage_key"):
            logo_url = f"/api/v1/cases/public/{case_id}/logo"
        elif business_profile and business_profile.get("logo_url"):
             logo_url = business_profile.get("logo_url")

        # 5. Extract Extended Profile Details
        profile_data = business_profile or {}
        
        owner_address = profile_data.get("address")
        owner_city = profile_data.get("city")
        owner_phone = profile_data.get("phone")
        owner_email = profile_data.get("email_public") or (user_doc.get("email") if user_doc else None)
        owner_nui = profile_data.get("tax_id") or profile_data.get("nui")
        owner_website = profile_data.get("website")

        # 6. Gather Content (Documents & Timeline)
        
        # PHOENIX: Use a robust $or query to handle both string and ObjectId case_id formats.
        robust_case_query = {
            "$or": [{"case_id": case_id}, {"case_id": case_oid}],
            "is_shared": True
        }

        public_events_cursor = self.db["calendar_events"].find({
            "case_id": case_id,
            "is_public": True
        })
        timeline: List[Dict[str, Any]] = [
            {"title": e.get("title"), "date": e.get("start_date"), "type": e.get("event_type"), "description": e.get("description")}
            for e in list(public_events_cursor)
        ]
        
        shared_docs_cursor = self.db["documents"].find(robust_case_query)
        active_documents: List[Dict[str, Any]] = [
            {"id": str(d.get("_id")), "file_name": d.get("file_name"), "created_at": d.get("created_at"), "file_type": d.get("mime_type", "application/octet-stream"), "source": "ACTIVE"}
            for d in list(shared_docs_cursor)
        ]
        
        shared_archive_cursor = self.db["archives"].find(robust_case_query)
        archive_documents: List[Dict[str, Any]] = [
            {"id": str(doc.get("_id")), "file_name": doc.get("title"), "created_at": doc.get("created_at"), "file_type": doc.get("file_type", "application/octet-stream"), "source": "ARCHIVE"}
            for doc in list(shared_archive_cursor)
        ]

        # Return Data
        return {
            "case_number": case_doc.get("case_number"),
            "title": case_doc.get("title"),
            "client_name": case_doc.get("client", {}).get("name"),
            "status": case_doc.get("status"),
            "description": case_doc.get("description"), # Pass case description if any
            
            # --- Business Profile Data ---
            "organization_name": org_name,
            "logo": logo_url,
            "owner_address": owner_address,
            "owner_city": owner_city,
            "owner_phone": owner_phone,
            "owner_email": owner_email,
            "owner_nui": owner_nui,
            "owner_website": owner_website,
            
            # --- Content ---
            "timeline": sorted(timeline, key=lambda x: x['date'], reverse=True) if timeline else [],
            "documents": active_documents + archive_documents,
            "invoices": []
        }

    def set_case_share_status(self, case_id: str, user_id: str, is_shared: bool) -> bool:
        if not ObjectId.is_valid(case_id) or not ObjectId.is_valid(user_id):
            return False
        
        case_oid = ObjectId(case_id)
        user_oid = ObjectId(user_id)
        
        result = self.db["cases"].update_one(
            {"_id": case_oid, "user_id": user_oid},
            {"$set": {"is_shared": is_shared}}
        )
        if result.matched_count == 0:
             result = self.db["cases"].update_one(
                {"_id": case_oid, "owner_id": user_oid},
                {"$set": {"is_shared": is_shared}}
            )

        return result.modified_count > 0