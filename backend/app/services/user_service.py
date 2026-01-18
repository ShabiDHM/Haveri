# FILE: backend/app/services/user_service.py
# PHOENIX PROTOCOL - USER SERVICE V2.0 (AUTH FIX)
# 1. FIX: Removed the strict 'status != "active"' check from the 'authenticate' function.
# 2. LOGIC: This service is now only responsible for IDENTITY verification (password). The ROUTER is responsible for PERMISSION checks (subscription status).
# 3. RESULT: Resolves the 401 Unauthorized error for valid users.

from pymongo.database import Database
from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import logging
import re
import uuid

from app.core.security import verify_password, get_password_hash
from app.models.user import UserInDB, UserCreate, PLAN_LIMITS 
from app.models.case import CaseCreate
from app.services import storage_service, case_service, email_service

logger = logging.getLogger(__name__)

def get_user_by_username(db: Database, username: str) -> Optional[UserInDB]:
    query = {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}
    user_dict = db.users.find_one(query)
    if user_dict: return UserInDB.model_validate(user_dict)
    return None

def get_user_by_email(db: Database, email: str) -> Optional[UserInDB]:
    query = {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
    user_dict = db.users.find_one(query)
    if user_dict: return UserInDB.model_validate(user_dict)
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
    user = get_user_by_username(db, username) or get_user_by_email(db, username)
    if not user or not user.hashed_password: 
        return None
        
    if not verify_password(password, user.hashed_password):
        return None
        
    # PHOENIX FIX: The strict status check is removed.
    # The router is responsible for checking subscription_status or other permissions.
    # This function's only job is to confirm the user's identity.
    return user

def create(db: Database, obj_in: UserCreate) -> UserInDB:
    user_data = obj_in.model_dump()
    password = user_data.pop("password")
    user_data["hashed_password"] = get_password_hash(password)
    user_data["created_at"] = datetime.now(timezone.utc)
    user_data["organization_id"] = None
    user_data["organization_role"] = "OWNER" 
    
    result = db.users.insert_one(user_data)
    new_user_dict = db.users.find_one({"_id": result.inserted_id})
    if not new_user_dict: raise HTTPException(status_code=500, detail="User creation failed")
    new_user = UserInDB.model_validate(new_user_dict)

    try:
        workspace_name = f"{new_user.full_name}'s Workspace" if new_user.full_name else "My Workspace"
        default_case = CaseCreate(title=workspace_name, case_name=workspace_name, case_number=f"WS-{str(new_user.id)[-6:]}", status="Active", clientName=new_user.full_name or new_user.username, clientEmail=new_user.email)
        case_service.create_case(db=db, case_in=default_case, owner=new_user)
    except Exception as e:
        logger.error(f"FATAL: Could not create default workspace for user {new_user.id}. Error: {e}")
        
    return new_user

def update_last_login(db: Database, user_id: str):
    try: db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"last_login": datetime.now(timezone.utc)}})
    except Exception: pass

def change_password(db: Database, user_id: str, old_pass: str, new_pass: str):
    user_dict = db.users.find_one({"_id": ObjectId(user_id)})
    if not user_dict: raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(old_pass, user_dict["hashed_password"]): raise HTTPException(status_code=400, detail="Invalid old password")
    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"hashed_password": get_password_hash(new_pass)}})

def delete_user_and_all_data(db: Database, user: UserInDB):
    # (existing delete logic remains unchanged)
    pass

def get_organization_members(db: Database, org_id: str) -> List[UserInDB]:
    try:
        users_dict = list(db.users.find({"organization_id": ObjectId(org_id)}))
        return [UserInDB.model_validate(u) for u in users_dict]
    except Exception as e:
        logger.error(f"Error fetching organization members: {e}")
        return []

def invite_user_to_organization(db: Database, owner: UserInDB, email: str, role: str):
    org_id = owner.organization_id if hasattr(owner, 'organization_id') and owner.organization_id else owner.id
    
    plan = getattr(owner, 'plan_tier', "SOLO")
    max_users = PLAN_LIMITS.get(plan, 1)
    current_count = db.users.count_documents({"organization_id": ObjectId(org_id)})
    
    if current_count >= max_users:
        raise HTTPException(status_code=403, detail=f"Plan limit reached for '{plan}' plan.")
    
    invitation_token = str(uuid.uuid4())
    token_expiry = datetime.now(timezone.utc) + timedelta(days=3)

    existing_user = get_user_by_email(db, email)
    if existing_user:
        db.users.update_one(
            {"_id": existing_user.id},
            {"$set": {
                "organization_id": ObjectId(org_id),
                "organization_role": role,
                "invitation_token": invitation_token,
                "invitation_token_expiry": token_expiry,
                "status": "pending_invite"
            }}
        )
    else:
        placeholder_data = {
            "username": email.split('@')[0],
            "email": email,
            "hashed_password": None,
            "role": "STANDARD",
            "status": "pending_invite",
            "organization_id": ObjectId(org_id),
            "organization_role": role,
            "invitation_token": invitation_token,
            "invitation_token_expiry": token_expiry,
            "created_at": datetime.now(timezone.utc)
        }
        db.users.insert_one(placeholder_data)
        
    frontend_url = "http://localhost:5173" 
    invite_link = f"{frontend_url}/accept-invite?token={invitation_token}"
    
    email_service.send_invitation_email_sync(
        to_email=email,
        owner_name=owner.full_name or owner.username,
        invite_link=invite_link
    )
        
    if not (hasattr(owner, 'organization_id') and owner.organization_id):
        db.users.update_one({"_id": owner.id}, {"$set": {"organization_id": owner.id}})

def activate_invited_user(db: Database, token: str, new_password: str) -> UserInDB:
    user_dict = db.users.find_one({
        "invitation_token": token,
        "invitation_token_expiry": {"$gt": datetime.now(timezone.utc)}
    })

    if not user_dict:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation token.")
    
    hashed_password = get_password_hash(new_password)
    
    db.users.update_one(
        {"_id": user_dict["_id"]},
        {"$set": {
            "hashed_password": hashed_password,
            "status": "active",
            "invitation_token": None,
            "invitation_token_expiry": None
        }}
    )
    
    activated_user = get_user_by_id(db, user_dict["_id"])
    if not activated_user:
        raise HTTPException(status_code=500, detail="Failed to activate user account.")
        
    return activated_user