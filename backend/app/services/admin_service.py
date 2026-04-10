# FILE: backend/app/services/admin_service.py
# PHOENIX PROTOCOL - ADMIN SERVICE V3.2 (WORKSPACE-BASED LEFT-JOIN SAFE AGGREGATION)

from bson import ObjectId
from datetime import datetime
from typing import List, Optional, Dict, Any
from pymongo.database import Database
from pymongo import ReturnDocument
import logging

from ..models.admin import UserUpdateRequest, AdminUserOut

logger = logging.getLogger(__name__)

USER_COLLECTION = "users"
WORKSPACE_COLLECTION = "workspaces"
DOCUMENT_COLLECTION = "documents"


def get_all_users(db: Database) -> List[Dict[str, Any]]:
    """
    Get all users with their workspace and document counts.
    Uses LEFT JOIN semantics - users with 0 workspaces/documents still appear.
    """
    pipeline = [
        # Left-join with workspaces collection using user_id
        {
            "$lookup": {
                "from": WORKSPACE_COLLECTION,
                "localField": "_id",
                "foreignField": "user_id",
                "as": "owned_workspaces",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Get all workspace IDs from the user's workspaces
        {
            "$addFields": {
                "workspace_ids": "$owned_workspaces._id"
            }
        },
        # Left-join with documents collection using workspace_id
        {
            "$lookup": {
                "from": DOCUMENT_COLLECTION,
                "localField": "workspace_ids",
                "foreignField": "workspace_id",
                "as": "owned_documents",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Safe size calculation using $ifNull
        {
            "$addFields": {
                "id": {"$toString": "$_id"},
                "workspace_count": {"$size": {"$ifNull": ["$owned_workspaces", []]}},
                "document_count": {"$size": {"$ifNull": ["$owned_documents", []]}}
            }
        },
        # Project only the fields needed for admin view
        {
            "$project": {
                "_id": 0,
                "owned_workspaces": 0,
                "workspace_ids": 0,
                "owned_documents": 0,
                "hashed_password": 0
            }
        }
    ]
    
    users_data = list(db[USER_COLLECTION].aggregate(pipeline))
    return users_data


def find_user_in_aggregate(user_id: str, db: Database) -> Optional[AdminUserOut]:
    """
    Find a single user by ID with their workspace and document counts.
    Uses LEFT JOIN semantics.
    """
    try:
        oid = ObjectId(user_id)
    except:
        return None

    pipeline = [
        {"$match": {"_id": oid}},
        # Left-join with workspaces collection using user_id
        {
            "$lookup": {
                "from": WORKSPACE_COLLECTION,
                "localField": "_id",
                "foreignField": "user_id",
                "as": "owned_workspaces",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Get workspace IDs
        {
            "$addFields": {
                "workspace_ids": "$owned_workspaces._id"
            }
        },
        # Left-join with documents collection using workspace_id
        {
            "$lookup": {
                "from": DOCUMENT_COLLECTION,
                "localField": "workspace_ids",
                "foreignField": "workspace_id",
                "as": "owned_documents",
                "preserveNullAndEmptyArrays": True
            }
        },
        # Safe size calculation
        {
            "$addFields": {
                "id": {"$toString": "$_id"},
                "workspace_count": {"$size": {"$ifNull": ["$owned_workspaces", []]}},
                "document_count": {"$size": {"$ifNull": ["$owned_documents", []]}}
            }
        },
        {
            "$project": {
                "_id": 0,
                "owned_workspaces": 0,
                "workspace_ids": 0,
                "owned_documents": 0,
                "hashed_password": 0
            }
        }
    ]
    
    result = list(db[USER_COLLECTION].aggregate(pipeline))
    if not result:
        return None
    return AdminUserOut.model_validate(result[0])


def update_user_details(user_id: str, update_data: UserUpdateRequest, db: Database) -> Optional[AdminUserOut]:
    """
    Update user details and return the updated user with counts.
    """
    payload = update_data.model_dump(exclude_unset=True)
    
    if update_data.status:
        payload['status'] = update_data.status.lower()

    logger.info(f"--- [ADMIN] Updating User {user_id} ---")
    logger.info(f"--- [ADMIN] Final Payload: {payload} ---")

    if not payload:
        return find_user_in_aggregate(user_id, db)

    try:
        updated_user_doc = db.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": payload},
            return_document=ReturnDocument.AFTER
        )
        
        if not updated_user_doc:
            logger.error(f"User {user_id} not found during update.")
            raise FileNotFoundError("User not found")
            
        logger.info(f"--- [ADMIN] Success. DB Status is now: {updated_user_doc.get('status')} ---")
        
        return find_user_in_aggregate(user_id, db)
    except Exception as e:
        logger.error(f"Update failed: {e}")
        raise e


def expire_subscriptions(db: Database) -> int:
    """
    Expire subscriptions where the expiry date has passed.
    """
    now = datetime.utcnow()
    result = db.users.update_many(
        {"subscription_status": "active", "subscription_expiry_date": {"$lt": now}},
        {"$set": {"subscription_status": "expired"}}
    )
    return result.modified_count