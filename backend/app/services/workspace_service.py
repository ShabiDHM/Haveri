# FILE: backend/app/services/workspace_service.py
# PHOENIX PROTOCOL - WORKSPACE SERVICE V1.6 (EXPLICIT BOTH FIELDS)

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

        # Always try to get client data from either nested or flat
        client = ws_doc.get("client")
        if client is None:
            # Try flat
            flat_name = ws_doc.get("clientName") or ws_doc.get("client_name")
            if flat_name:
                client = {
                    "name": flat_name,
                    "email": ws_doc.get("clientEmail") or ws_doc.get("client_email"),
                    "phone": ws_doc.get("clientPhone") or ws_doc.get("client_phone"),
                }

        # Extract flat fields from client (if any)
        client_name = client.get("name") if client else None
        client_email = client.get("email") if client else None
        client_phone = client.get("phone") if client else None

        org_id = ws_doc.get("org_id")
        if isinstance(org_id, ObjectId):
            org_id = str(org_id)

        # Prepare response
        response = {
            "id": ws_id_obj,
            "title": title,
            "status": ws_doc.get("status", "ACTIVE"),
            "created_at": created_at,
            "updated_at": ws_doc.get("updated_at", created_at),
            "org_id": org_id,
            "document_count": counts["document_count"],
            "alert_count": counts["alert_count"],
            "event_count": counts["event_count"],
        }

        # Add client fields if they exist
        if client:
            response["client"] = client
        if client_name:
            response["clientName"] = client_name
        if client_email:
            response["clientEmail"] = client_email
        if client_phone:
            response["clientPhone"] = client_phone

        # Debug print to console
        print(f"Mapped workspace {ws_id_str}: client={client}, clientName={client_name}")

        return response
    except Exception as e:
        print(f"Error mapping workspace: {e}")
        return None

def create_workspace(db: Database, ws_in: WorkspaceCreate, owner: UserInDB) -> Optional[Dict[str, Any]]:
    ws_dict = ws_in.model_dump()
    # Keep flat fields as they are
    ws_dict.update({
        "owner_id": owner.id,
        "user_id": owner.id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    })
    # Also create a nested client if we have flat fields, to keep consistency
    if ws_in.clientName:
        ws_dict["client"] = {
            "name": ws_in.clientName,
            "email": ws_in.clientEmail,
            "phone": ws_in.clientPhone,
        }
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