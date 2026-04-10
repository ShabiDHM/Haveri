# FILE: backend/app/services/admin_service.py
# PHOENIX PROTOCOL - ADMIN SERVICE V3.6 (ADDED plan_tier TO RESPONSE)

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
    Returns fields matching AdminUserOut model including plan_tier.
    """
    logger.info("--- [ADMIN] get_all_users called ---")
    
    # Get all users first
    all_users = list(db[USER_COLLECTION].find({}, {"hashed_password": 0}))
    logger.info(f"--- [ADMIN] Total users found: {len(all_users)} ---")
    
    if not all_users:
        return []
    
    result = []
    for user in all_users:
        user_id = user["_id"]
        
        # Count workspaces owned by this user
        workspace_count = db[WORKSPACE_COLLECTION].count_documents({"user_id": user_id})
        
        # Get all workspace IDs for this user
        workspace_ids = [w["_id"] for w in db[WORKSPACE_COLLECTION].find({"user_id": user_id}, {"_id": 1})]
        
        # Count documents in those workspaces
        document_count = 0
        if workspace_ids:
            document_count = db[DOCUMENT_COLLECTION].count_documents({"workspace_id": {"$in": workspace_ids}})
        
        # Build response matching AdminUserOut model
        user_dict = {
            "id": str(user_id),
            "username": user.get("email", ""),
            "email": user.get("email", ""),
            "first_name": user.get("first_name", ""),
            "last_name": user.get("last_name", ""),
            "role": user.get("role", "user"),
            "status": user.get("status", "ACTIVE"),
            "subscription_status": user.get("subscription_status", "inactive"),
            "subscription_expiry_date": user.get("subscription_expiry_date"),
            "created_at": user.get("created_at"),
            "case_count": workspace_count,
            "document_count": document_count,
            "plan_tier": user.get("plan_tier", "SOLO"),  # ADDED: Include plan_tier
        }
        result.append(user_dict)
    
    logger.info(f"--- [ADMIN] Returning {len(result)} users ---")
    return result


def find_user_in_aggregate(user_id: str, db: Database) -> Optional[AdminUserOut]:
    """
    Find a single user by ID with their workspace and document counts.
    """
    try:
        oid = ObjectId(user_id)
    except:
        logger.error(f"--- [ADMIN] Invalid user_id: {user_id} ---")
        return None
    
    user = db[USER_COLLECTION].find_one({"_id": oid}, {"hashed_password": 0})
    if not user:
        logger.warning(f"--- [ADMIN] User {user_id} not found ---")
        return None
    
    # Count workspaces
    workspace_count = db[WORKSPACE_COLLECTION].count_documents({"user_id": oid})
    
    # Get workspace IDs
    workspace_ids = [w["_id"] for w in db[WORKSPACE_COLLECTION].find({"user_id": oid}, {"_id": 1})]
    
    # Count documents
    document_count = 0
    if workspace_ids:
        document_count = db[DOCUMENT_COLLECTION].count_documents({"workspace_id": {"$in": workspace_ids}})
    
    # Build response matching AdminUserOut model
    user_dict = {
        "id": str(user["_id"]),
        "username": user.get("email", ""),
        "email": user.get("email", ""),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "user"),
        "status": user.get("status", "ACTIVE"),
        "subscription_status": user.get("subscription_status", "inactive"),
        "subscription_expiry_date": user.get("subscription_expiry_date"),
        "created_at": user.get("created_at"),
        "case_count": workspace_count,
        "document_count": document_count,
        "plan_tier": user.get("plan_tier", "SOLO"),  # ADDED: Include plan_tier
    }
    
    logger.info(f"--- [ADMIN] User {user_id}: {workspace_count} workspaces, {document_count} documents, plan: {user_dict['plan_tier']} ---")
    return AdminUserOut.model_validate(user_dict)


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