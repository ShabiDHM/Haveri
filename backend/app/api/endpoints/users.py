# FILE: backend/app/api/endpoints/users.py
# PHOENIX PROTOCOL - USER ENDPOINTS V2.2 (TEAM MANAGEMENT)
# 1. FEATURE: Added '/invite', '/team', and '/team/{id}' endpoints.
# 2. LOGIC: Enforces 'OWNER' role checks for team modifications.
# 3. STYLE: Preserved existing '/me' endpoints and dependency injection style.

from fastapi import APIRouter, Depends, status, HTTPException
from typing import Annotated, List, Any
from pymongo.database import Database
from pydantic import BaseModel, EmailStr
from bson import ObjectId

from ...models.user import UserOut, UserInDB
from .dependencies import get_current_user
from ...core.db import get_db
from ...services import user_service

router = APIRouter()

# --- INPUT SCHEMAS ---
class InviteRequest(BaseModel):
    email: EmailStr
    role: str = "MEMBER"

# --- EXISTING ENDPOINTS ---

@router.get("/me", response_model=UserOut)
def get_current_user_profile(
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Retrieves the profile for the currently authenticated user.
    """
    return UserOut.model_validate(current_user)

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_own_account(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
):
    """
    Permanently deletes the current user and all their associated data.
    """
    user_service.delete_user_and_all_data(user=current_user, db=db)

# --- PHOENIX: TEAM MANAGEMENT ENDPOINTS ---

@router.post("/invite", status_code=status.HTTP_200_OK)
def invite_team_member(
    invite: InviteRequest,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
) -> Any:
    """
    Invite a new user to the organization.
    Only the Organization OWNER can do this.
    """
    # 1. Permission Check
    if current_user.organization_role != 'OWNER':
        raise HTTPException(
            status_code=403, 
            detail="Only the Organization Owner can invite members."
        )

    # 2. Prevent Self-Invite
    if invite.email.lower() == current_user.email.lower():
         raise HTTPException(status_code=400, detail="You cannot invite yourself.")

    # 3. Execute Service Logic
    user_service.invite_user_to_organization(
        db=db,
        owner=current_user,
        email=invite.email,
        role=invite.role
    )
    
    return {"message": f"Invitation sent to {invite.email}"}

@router.get("/team", response_model=List[UserOut])
def get_team_members(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
) -> Any:
    """
    Get all members of the current user's organization.
    """
    # Use Org ID if present, otherwise fallback to User ID (Solo mode)
    org_id = current_user.organization_id or current_user.id
    
    # We use the service function added in the previous step
    members = user_service.get_organization_members(db, str(org_id))
    return members

@router.delete("/team/{user_id}", status_code=status.HTTP_200_OK)
def remove_team_member(
    user_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Database = Depends(get_db)
) -> Any:
    """
    Remove a member from the organization.
    """
    if current_user.organization_role != 'OWNER':
        raise HTTPException(status_code=403, detail="Only Owners can remove members.")
        
    # Prevent removing self (must use delete account for that)
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself via this endpoint.")

    # Unlink Logic: Find user by ID AND Org ID to ensure they belong to this team
    target_oid = ObjectId(user_id)
    org_oid = current_user.organization_id or current_user.id
    
    result = db.users.update_one(
        {"_id": target_oid, "organization_id": org_oid},
        {
            "$set": {
                "organization_id": None, 
                "organization_role": "OWNER", # Reset to being their own owner
                "status": "inactive" # Optionally set to inactive
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found in your team.")
    
    return {"message": "User removed from organization."}