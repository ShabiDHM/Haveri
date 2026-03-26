# FILE: backend/app/services/workspace_service.py
# PHOENIX PROTOCOL - WORKSPACE SERVICE V1.6 (FLAT + NESTED CLIENT DATA)
# 1. Ensures both nested client object and flat clientName/Email/Phone are present in response.
# 2. Handles legacy flat fields during creation and mapping.
# 3. STATUS: Ready for replacement.

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
    """Map a MongoDB workspace document to the response dict expected by the frontend."""
    try:
        ws_id_obj = ws_doc["_id"]
        ws_id_str = str(ws_id_obj)
        title = ws_doc.get("title") or "Hapësira Ime"
        created_at = ws_doc.get("created_at") or datetime.now(timezone.utc)
        
        # Counts for documents, events, alerts
        counts = {"document_count": 0, "alert_count": 0, "event_count": 0}
        if db is not None:
            counts["document_count"] = db.documents.count_documents({"case_id": ws_id_str})
            counts["event_count"] = db.calendar_events.count_documents({"case_id": ws_id_str})
            counts["alert_count"] = db.calendar_events.count_documents({"case_id": ws_id_str, "status": "pending"})

        # ----- CLIENT DATA: Nested first, then flat fallback -----
        client = ws_doc.get("client")
        if client is None:
            # Try to build from legacy flat fields (client_name, clientName, etc.)
            flat_name = ws_doc.get("client_name") or ws_doc.get("clientName")
            if flat_name:
                client = {
                    "name": flat_name,
                    "email": ws_doc.get("client_email") or ws_doc.get("clientEmail"),
                    "phone": ws_doc.get("client_phone") or ws_doc.get("clientPhone"),
                }
        # Now extract flat versions from the client object (if any)
        client_name = client.get("name") if client else None
        client_email = client.get("email") if client else None
        client_phone = client.get("phone") if client else None

        # ----- ORG_ID (multi‑tenant) -----
        org_id = ws_doc.get("org_id")
        if isinstance(org_id, ObjectId):
            org_id = str(org_id)

        # Return the mapped object with both nested and flat client fields
        return {
            "id": ws_id_obj,
            "title": title,
            "status": ws_doc.get("status", "ACTIVE"),
            "created_at": created_at,
            "updated_at": ws_doc.get("updated_at", created_at),
            "org_id": org_id,
            "client": client,                    # nested object for frontend's client property
            "clientName": client_name,          # flat for legacy frontend
            "clientEmail": client_email,        # flat for legacy frontend
            "clientPhone": client_phone,        # flat for legacy frontend
            **counts
        }
    except Exception as e:
        # Log the error but don't crash the whole request
        print(f"Error mapping workspace document: {e}")
        return None

def create_workspace(db: Database, ws_in: WorkspaceCreate, owner: UserInDB) -> Optional[Dict[str, Any]]:
    """Create a new workspace and return the mapped response."""
    ws_dict = ws_in.model_dump()
    
    # Build nested client object from flat fields provided by the frontend
    client_data = None
    if ws_in.clientName:
        client_data = {
            "name": ws_in.clientName,
            "email": ws_in.clientEmail,
            "phone": ws_in.clientPhone,
        }
    
    # Remove flat client fields to avoid duplication in MongoDB
    ws_dict.pop("clientName", None)
    ws_dict.pop("clientEmail", None)
    ws_dict.pop("clientPhone", None)
    
    # Add the nested client if any
    if client_data:
        ws_dict["client"] = client_data
    
    # Add ownership and timestamps
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
    """Get all workspaces belonging to the user."""
    cursor = db.cases.find({"owner_id": owner.id}).sort("updated_at", -1)
    results = []
    for doc in cursor:
        mapped = _map_workspace_document(doc, db)
        if mapped:
            results.append(mapped)
    return results

def get_workspace_by_id(db: Database, ws_id: ObjectId, owner: UserInDB) -> Optional[Dict[str, Any]]:
    """Get a single workspace by ID, ensuring it belongs to the user."""
    ws = db.cases.find_one({"_id": ws_id, "owner_id": owner.id})
    if not ws: 
        return None
    return _map_workspace_document(ws, db)

def delete_workspace_by_id(db: Database, ws_id: ObjectId, owner: UserInDB):
    """Delete a workspace if it belongs to the user."""
    db.cases.delete_one({"_id": ws_id, "owner_id": owner.id})