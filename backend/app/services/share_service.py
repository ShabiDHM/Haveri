# FILE: backend/app/services/share_service.py
# PHOENIX PROTOCOL - SHARE SERVICE V1.3 (BRANDING FIX)
# 1. FIX: Corrected user_id type in business_profile query from ObjectId to str. This resolves the bug preventing the logo and firm name from appearing on the client portal.

from pymongo.database import Database
from typing import Dict, Any, List
from bson import ObjectId

class ShareService:
    def __init__(self, db: Database):
        self.db = db

    def get_public_case_data(self, case_id: str) -> Dict[str, Any]:
        if not ObjectId.is_valid(case_id):
            return {}
        
        case_oid = ObjectId(case_id)
        
        case_doc = self.db["cases"].find_one({"_id": case_oid})
        
        if not case_doc:
            return {}

        user_id = case_doc.get("user_id")
        
        # PHOENIX FIX: The business_profiles collection uses a string representation of the user_id.
        business_profile = self.db["business_profiles"].find_one({"user_id": str(user_id)}) or {}

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

        if not timeline and not active_documents and not archive_documents:
            return {}

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