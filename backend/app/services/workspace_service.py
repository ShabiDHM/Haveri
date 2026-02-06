# FILE: backend/app/services/workspace_service.py
# PHOENIX PROTOCOL - WORKSPACE SERVICE V1.1 (TYPE FIX)
# 1. FIXED: Explicit list filtering to ensure return type matches List[Dict[str, Any]].
# 2. STATUS: Build-ready.

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

        return {
            "id": ws_id_obj, 
            "title": title,
            "status": ws_doc.get("status", "ACTIVE"),
            "created_at": created_at, 
            "updated_at": ws_doc.get("updated_at", created_at), 
            **counts
        }
    except Exception: return None

def create_workspace(db: Database, ws_in: WorkspaceCreate, owner: UserInDB) -> Optional[Dict[str, Any]]:
    ws_dict = ws_in.model_dump()
    ws_dict.update({
        "owner_id": owner.id, "user_id": owner.id,
        "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
    })
    result = db.cases.insert_one(ws_dict) 
    new_ws = db.cases.find_one({"_id": result.inserted_id})
    return _map_workspace_document(cast(Dict[str, Any], new_ws), db)

def get_workspaces_for_user(db: Database, owner: UserInDB) -> List[Dict[str, Any]]:
    cursor = db.cases.find({"owner_id": owner.id}).sort("updated_at", -1)
    # PHOENIX: Filtered list to satisfy return type List[Dict[str, Any]]
    results = []
    for doc in cursor:
        mapped = _map_workspace_document(doc, db)
        if mapped:
            results.append(mapped)
    return results

def get_workspace_by_id(db: Database, ws_id: ObjectId, owner: UserInDB) -> Optional[Dict[str, Any]]:
    ws = db.cases.find_one({"_id": ws_id, "owner_id": owner.id})
    if not ws: return None
    return _map_workspace_document(ws, db)

def delete_workspace_by_id(db: Database, ws_id: ObjectId, owner: UserInDB):
    db.cases.delete_one({"_id": ws_id, "owner_id": owner.id})