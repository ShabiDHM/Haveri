# FILE: backend/app/services/user_service.py
# PHOENIX PROTOCOL - USER SERVICE V1.8 (QUOTA ENFORCEMENT)
# 1. LOGIC: Checks current team size against 'PLAN_LIMITS' before allowing an invite.
# 2. SECURITY: Blocks invites if the plan limit is reached (e.g., SOLO plan trying to add a member).

from pymongo.database import Database
from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional, List
import logging
import re

from app.core.security import verify_password, get_password_hash
# PHOENIX: Imported PLAN_LIMITS
from app.models.user import UserInDB, UserCreate, PLAN_LIMITS 
from app.models.case import CaseCreate
from app.services import storage_service, case_service

logger = logging.getLogger(__name__)

def get_user_by_username(db: Database, username: str) -> Optional[UserInDB]:
    query = {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}
    user_dict = db.users.find_one(query)
    if user_dict:
        return UserInDB.model_validate(user_dict)
    return None

def get_user_by_email(db: Database, email: str) -> Optional[UserInDB]:
    query = {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
    user_dict = db.users.find_one(query)
    if user_dict:
        return UserInDB.model_validate(user_dict)
    return None

def get_user_by_id(db: Database, user_id: ObjectId) -> Optional[UserInDB]:
    user_dict = db.users.find_one({"_id": user_id})
    if user_dict:
        business_profile = db.business_profiles.find_one({"user_id": str(user_id)})
        if business_profile:
            user_dict["business_profile"] = {
                "firm_name": business_profile.get("firm_name"),
                "logo_url": business_profile.get("logo_url")
            }
        return UserInDB.model_validate(user_dict)
    return None

def authenticate(db: Database, username: str, password: str) -> Optional[UserInDB]:
    user = get_user_by_username(db, username)
    if not user:
        user = get_user_by_email(db, username)
        
    if not user:
        return None
        
    if not verify_password(password, user.hashed_password):
        return None
        
    fresh_user = get_user_by_id(db, user.id)

    if not fresh_user:
        return None

    if fresh_user.status != "active":
        logger.warning(f"Login attempt for inactive user: {username}")
        return None
        
    return fresh_user

def create(db: Database, obj_in: UserCreate) -> UserInDB:
    user_data = obj_in.model_dump()
    password = user_data.pop("password")
    hashed_password = get_password_hash(password)
    
    user_data["hashed_password"] = hashed_password
    user_data["created_at"] = datetime.now(timezone.utc)
    
    user_data["organization_id"] = None
    user_data["organization_role"] = "OWNER" 
    # Default plan is already set to SOLO in model
    
    result = db.users.insert_one(user_data)
    new_user_dict = db.users.find_one({"_id": result.inserted_id})
    
    if not new_user_dict:
        raise HTTPException(status_code=500, detail="User creation failed")
    
    new_user = UserInDB.model_validate(new_user_dict)

    try:
        logger.info(f"Creating default workspace for new user {new_user.id}")
        workspace_name = f"{new_user.full_name}'s Workspace" if new_user.full_name else "My Workspace"
        default_case = CaseCreate(
            title=workspace_name,
            case_name=workspace_name,
            case_number=f"WS-{str(new_user.id)[-6:]}",
            status="Active",
            clientName=new_user.full_name or new_user.username,
            clientEmail=new_user.email
        )
        case_service.create_case(db=db, case_in=default_case, owner=new_user)
        logger.info(f"Successfully created default workspace for user {new_user.id}")
    except Exception as e:
        logger.error(f"FATAL: Could not create default workspace for user {new_user.id}. Error: {e}")
        
    return new_user

def update_last_login(db: Database, user_id: str):
    try:
        oid = ObjectId(user_id)
        db.users.update_one({"_id": oid}, {"$set": {"last_login": datetime.now(timezone.utc)}})
    except Exception:
        pass

def change_password(db: Database, user_id: str, old_pass: str, new_pass: str):
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user_dict = db.users.find_one({"_id": oid})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(old_pass, user_dict["hashed_password"]):
        raise HTTPException(status_code=400, detail="Invalid old password")

    new_hash = get_password_hash(new_pass)
    db.users.update_one({"_id": oid}, {"$set": {"hashed_password": new_hash}})

def delete_user_and_all_data(db: Database, user: UserInDB):
    user_id = user.id
    try:
        cases_to_delete = list(db.cases.find({"owner_id": user_id}))
        if cases_to_delete:
            case_ids = [c["_id"] for c in cases_to_delete]
            docs_to_delete = list(db.documents.find({"case_id": {"$in": case_ids}}))
            for doc in docs_to_delete:
                if doc.get("storage_key"): storage_service.delete_file(doc["storage_key"])
                if doc.get("preview_storage_key"): storage_service.delete_file(doc["preview_storage_key"])
                if doc.get("processed_text_storage_key"): storage_service.delete_file(doc["processed_text_storage_key"])
            
            db.findings.delete_many({"case_id": {"$in": case_ids}})
            db.documents.delete_many({"case_id": {"$in": case_ids}})
            db.calendar_events.delete_many({"case_id": {"$in": case_ids}})
            db.cases.delete_many({"_id": {"$in": case_ids}})

        db.business_profiles.delete_one({"user_id": str(user_id)})
        db.users.delete_one({"_id": user_id})
        
    except Exception as e:
        logger.error(f"Failed during cascading delete for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="A failure occurred during the account deletion process.")

def get_organization_members(db: Database, org_id: str) -> List[UserInDB]:
    try:
        users_dict = list(db.users.find({"organization_id": ObjectId(org_id)}))
        return [UserInDB.model_validate(u) for u in users_dict]
    except Exception as e:
        logger.error(f"Error fetching organization members: {e}")
        return []

def invite_user_to_organization(db: Database, owner: UserInDB, email: str, role: str):
    org_id = owner.organization_id if owner.organization_id else owner.id
    
    # --- PHOENIX: QUOTA ENFORCEMENT ---
    # 1. Determine Quota
    plan = owner.plan_tier or "SOLO" # Default to lowest if missing
    max_users = PLAN_LIMITS.get(plan, 1)
    
    # 2. Count Current Usage
    # Count all users with this org_id (Active + Pending)
    current_count = db.users.count_documents({"organization_id": ObjectId(org_id)})
    
    # 3. Enforce Limit
    if current_count >= max_users:
        raise HTTPException(
            status_code=403, 
            detail=f"Plan limit reached. Your '{plan}' plan allows a maximum of {max_users} users. Please upgrade to add more."
        )
    # ----------------------------------
    
    existing_user = get_user_by_email(db, email)
    
    if existing_user:
        db.users.update_one(
            {"_id": existing_user.id},
            {"$set": {
                "organization_id": ObjectId(org_id),
                "organization_role": role
            }}
        )
    else:
        placeholder_data = {
            "username": email.split('@')[0],
            "email": email,
            "hashed_password": get_password_hash("TempPass123!"),
            "role": "STANDARD",
            "subscription_status": "PENDING_INVITE",
            "status": "inactive",
            "organization_id": ObjectId(org_id),
            "organization_role": role,
            "plan_tier": "MEMBER", # Members don't have their own plan, they inherit
            "created_at": datetime.now(timezone.utc)
        }
        db.users.insert_one(placeholder_data)
        
    if not owner.organization_id:
        db.users.update_one(
            {"_id": owner.id},
            {"$set": {"organization_id": owner.id, "organization_role": "OWNER"}}
        )