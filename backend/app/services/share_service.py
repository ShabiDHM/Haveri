# FILE: backend/app/services/share_service.py
# PHOENIX PROTOCOL - SHARE SERVICE V1.4 (BRANDING FIX)
# 1. FIX: Added fallback to 'users' collection to ensure 'organization_name' is never empty.
# 2. FIX: Properly routes 'logo' to the public streaming endpoint if a logo exists.

from pymongo.database import Database
from typing import Dict, Any, List
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

        # 1. Resolve Owner Profile (Business or Individual)
        # Try finding business profile with string ID first (standard)
        business_profile = self.db["business_profiles"].find_one({"user_id": str(owner_id)})
        
        # If not found, and owner_id is ObjectId, try generic query just in case
        if not business_profile and isinstance(owner_id, ObjectId):
             business_profile = self.db["business_profiles"].find_one({"user_id": owner_id})

        # 2. Get Fallback User Info
        user_doc = self.db["users"].find_one({"_id": ObjectId(owner_id)}) if ObjectId.is_valid(str(owner_id)) else None
        
        # 3. Determine Display Name (Organization Name)
        # Priority: Business Name -> User Full Name -> "Zyra Ligjore"
        org_name = None
        if business_profile and business_profile.get("firm_name"):
            org_name = business_profile.get("firm_name")
        elif user_doc and user_doc.get("full_name"):
            org_name = user_doc.get("full_name")
        else:
            org_name = "Zyra Ligjore"

        # 4. Determine Logo URL
        # If we have a storage key, we point to the public streaming endpoint
        logo_url = None
        if business_profile and business_profile.get("logo_storage_key"):
            logo_url = f"/api/v1/cases/public/{case_id}/logo"
        elif business_profile and business_profile.get("logo_url"):
             logo_url = business_profile.get("logo_url")

        # 5. Gather Content
        public_events_cursor = self.db["calendar_events"].find({
            "case_id": case_id,
            "is_public": True
        })
        timeline: List[Dict[str, Any]] = [
            {"title": e.get("title"), "date": e.get("start_date"), "type": e.get("event_type"), "description": e.get("description")}
            for e in list(public_events_cursor)
        ]
        
        shared_docs_cursor = self.db["documents"].find({
            "case_id": case_id,
            "is_shared": True
        })
        active_documents: List[Dict[str, Any]] = [
            {"id": str(d.get("_id")), "file_name": d.get("file_name"), "created_at": d.get("created_at"), "file_type": d.get("mime_type", "application/octet-stream"), "source": "ACTIVE"}
            for d in list(shared_docs_cursor)
        ]
        
        shared_archive_cursor = self.db["archives"].find({
            "case_id": case_oid,
            "is_shared": True
        })
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
            "organization_name": org_name,
            "logo": logo_url,
            "timeline": sorted(timeline, key=lambda x: x['date'], reverse=True) if timeline else [],
            "documents": active_documents + archive_documents,
            "invoices": []
        }

    def set_case_share_status(self, case_id: str, user_id: str, is_shared: bool) -> bool:
        if not ObjectId.is_valid(case_id):
            return False
        
        case_oid = ObjectId(case_id)
        # We allow owner_id to be checked against the session user
        # Note: In a real service, strict ownership check should be enforced via query
        
        result = self.db["cases"].update_one(
            {"_id": case_oid, "owner_id": ObjectId(user_id)},
            {"$set": {"is_shared": is_shared}}
        )
        return result.modified_count > 0