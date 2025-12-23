# FILE: backend/app/services/share_service.py
# PHOENIX PROTOCOL - SHARE SERVICE V1.1 (SELECTIVE SHARE FIX)
# 1. FIX: Removed the requirement for the parent case to be "shared". The service now correctly fetches any case and then finds selectively shared items within it. This resolves the "Access Denied" bug.

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
        
        # 1. Fetch the main case data
        case_doc = self.db["cases"].find_one({"_id": case_oid})
        
        # PHOENIX FIX: The case itself does not need to be shared. 
        # We only care if there are shared items *within* it.
        if not case_doc:
            return {}

        # 2. Fetch business profile for branding
        user_id = case_doc.get("user_id")
        business_profile = self.db["business_profiles"].find_one({"user_id": user_id}) or {}

        # 3. Fetch public calendar events
        public_events_cursor = self.db["calendar_events"].find({
            "case_id": case_id,
            "is_public": True
        })
        timeline: List[Dict[str, Any]] = [
            {
                "title": event.get("title"),
                "date": event.get("start_date"),
                "type": event.get("event_type"),
                "description": event.get("description")
            }
            for event in list(public_events_cursor)
        ]
        
        # 4. Fetch shared documents (from active cases)
        shared_docs_cursor = self.db["documents"].find({
            "case_id": case_id,
            "is_shared": True
        })
        active_documents: List[Dict[str, Any]] = [
            {
                "id": str(doc.get("_id")),
                "file_name": doc.get("file_name"),
                "created_at": doc.get("created_at"),
                "file_type": doc.get("mime_type", "application/octet-stream"),
                "source": "ACTIVE"
            }
            for doc in list(shared_docs_cursor)
        ]
        
        # 5. Fetch shared documents (from archive)
        shared_archive_cursor = self.db["archives"].find({
            "case_id": case_oid, # Query by ObjectId for consistency
            "is_shared": True
        })
        archive_documents: List[Dict[str, Any]] = [
            {
                "id": str(doc.get("_id")),
                "file_name": doc.get("title"),
                "created_at": doc.get("created_at"),
                "file_type": doc.get("file_type", "application/octet-stream"),
                "source": "ARCHIVE"
            }
            for doc in list(shared_archive_cursor)
        ]

        # If there is nothing to show, deny access.
        if not timeline and not active_documents and not archive_documents:
            return {}

        # 6. Fetch shared invoices (coming soon, stub for now)
        shared_invoices: List[Dict[str, Any]] = []

        return {
            "case_number": case_doc.get("case_number"),
            "title": case_doc.get("title"),
            "client_name": case_doc.get("client", {}).get("name"),
            "status": case_doc.get("status"),
            "organization_name": business_profile.get("firm_name"),
            "logo": business_profile.get("logo_url"),
            "timeline": sorted(timeline, key=lambda x: x['date'], reverse=True) if timeline else [],
            "documents": active_documents + archive_documents,
            "invoices": shared_invoices
        }

    def set_case_share_status(self, case_id: str, user_id: str, is_shared: bool) -> bool:
        """
        Updates the 'is_shared' flag on a case, verifying ownership.
        """
        if not ObjectId.is_valid(case_id) or not ObjectId.is_valid(user_id):
            return False
        
        case_oid = ObjectId(case_id)
        user_oid = ObjectId(user_id)
        
        case_doc = self.db["cases"].find_one({"_id": case_oid, "user_id": user_oid})
        if not case_doc:
            return False

        result = self.db["cases"].update_one(
            {"_id": case_oid},
            {"$set": {"is_shared": is_shared}}
        )
        return result.modified_count > 0