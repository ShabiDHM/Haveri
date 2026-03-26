# FILE: backend/app/services/workspace_service.py
# PHOENIX PROTOCOL - WORKSPACE SERVICE V1.5 (FLAT CLIENT FIELDS)

import re
import importlib
import urllib.parse 
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, cast
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from pymongo.database import Database

from ..models.workspace import WorkspaceCreate, WorkspaceInDB
from ..models.user import UserInDB
from ..celery_app import celery_app

def _map_workspace_document(ws_doc: Dict[str, Any], db: Optional[Database] = None) -> Optional[Dict[str, Any]]:
    try:
        ws_id_obj = ws_doc["_id"]
        ws_id_str = str(ws_id_obj)
        title = ws_doc.get("title") or "Hapësira Ime"
        created_at = ws_doc.get("created_at") or datetime.now(timezone.utc)
        
        counts = {"document_count": 0, "alert_count": 0, "event_count": 0}
        if db is not None:
            counts["document_count"] = db.documents.count_documents({"case_id": ws_id_str})
            counts["event_count"] = db.calendar_events.count_documents({"case_id": ws_id_str})
            counts["alert_count"] = db.calendar_events.count_documents({"case_id": ws_id_str, "status": "pending"})

        # Directly get flat client fields from the document
        client_name = ws_doc.get("clientName") or ws_doc.get("client_name")
        client_email = ws_doc.get("clientEmail") or ws_doc.get("client_email")
        client_phone = ws_doc.get("clientPhone") or ws_doc.get("client_phone")

        # Also try to get nested client if it exists (for legacy)
        client = ws_doc.get("client")
        if client and not client_name:
            client_name = client.get("name")
            client_email = client.get("email")
            client_phone = client.get("phone")

        org_id = ws_doc.get("org_id")
        if isinstance(org_id, ObjectId):
            org_id = str(org_id)

        return {
            "id": ws_id_obj,
            "title": title,
            "status": ws_doc.get("status", "ACTIVE"),
            "created_at": created_at,
            "updated_at": ws_doc.get("updated_at", created_at),
            "org_id": org_id,
            "clientName": client_name,
            "clientEmail": client_email,
            "clientPhone": client_phone,
            "client": client,  # optional, keep for compatibility
            **counts
        }
    except Exception:
        return None

def create_workspace(db: Database, ws_in: WorkspaceCreate, owner: UserInDB) -> Optional[Dict[str, Any]]:
    ws_dict = ws_in.model_dump()
    # Keep flat client fields as is (do not remove)
    ws_dict.update({
        "owner_id": owner.id,
        "user_id": owner.id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    })
    result = db.cases.insert_one(ws_dict) 
    new_ws = db.cases.find_one({"_id": result.inserted_id})
    return _map_workspace_document(cast(Dict[str, Any], new_ws), db)

def get_workspaces_for_user(db: Database, owner: UserInDB) -> List[Dict[str, Any]]:
    cursor = db.cases.find({"owner_id": owner.id}).sort("updated_at", -1)
    results = []
    for doc in cursor:
        mapped = _map_workspace_document(doc, db)
        if mapped:
            results.append(mapped)
    return results

def get_workspace_by_id(db: Database, ws_id: ObjectId, owner: UserInDB) -> Optional[Dict[str, Any]]:
    ws = db.cases.find_one({"_id": ws_id, "owner_id": owner.id})
    if not ws: 
        return None
    return _map_workspace_document(ws, db)

def delete_workspace_by_id(db: Database, ws_id: ObjectId, owner: UserInDB):
    db.cases.delete_one({"_id": ws_id, "owner_id": owner.id})