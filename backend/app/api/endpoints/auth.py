# FILE: backend/app/api/endpoints/auth.py
# PHOENIX PROTOCOL - AUTH ENGINE V5.5 (ADDED PASSWORD RESET ENDPOINTS)

from datetime import datetime, timedelta
from typing import Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel, EmailStr
from pymongo.database import Database
from bson import ObjectId

from app.core import security
from app.core.config import settings
from app.core.db import get_db
from app.services import user_service
from app.services.email_service import send_password_reset_email_sync
from app.models.token import Token
from app.models.user import UserInDB, UserCreate, UserLogin
from app.api.endpoints.dependencies import get_current_user

router = APIRouter()

class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str

class AcceptInviteSchema(BaseModel):
    token: str
    new_password: str

# ========== PASSWORD RESET MODELS ==========
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/login", response_model=Token)
async def login_access_token(response: Response, form_data: UserLogin, db: Database = Depends(get_db)) -> Any:
    normalized_username = form_data.username.lower()
    user = user_service.authenticate(db, username=normalized_username, password=form_data.password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if user.status != "active":
         raise HTTPException(status_code=403, detail="Llogaria juaj është joaktive ose në pritje.")

    user_service.update_last_login(db, str(user.id))

    context_org_id = str(user.organization_id) if user.organization_id else str(user.id)

    access_token_payload = {
        "id": str(user.id),
        "role": user.role,
        "org_id": context_org_id,
        "org_role": user.organization_role
    }
    access_token = security.create_access_token(data=access_token_payload)
    
    refresh_token_expires = timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    refresh_token = security.create_refresh_token(data={"id": str(user.id)}, expires_delta=refresh_token_expires)
    
    # PHOENIX: Determine the parent domain for the cookie for production environments
    cookie_domain = ".haveri.tech" if settings.ENVIRONMENT != "development" else None

    response.set_cookie(
        key="refresh_token", 
        value=refresh_token, 
        httponly=True, 
        secure=settings.ENVIRONMENT != "development", 
        samesite="lax",
        domain=cookie_domain,
        max_age=int(refresh_token_expires.total_seconds())
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


async def get_user_from_refresh_token(request: Request, db: Database = Depends(get_db)) -> UserInDB:
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not found")
    try:
        payload = security.decode_token(refresh_token)
        if payload.get("type") != "refresh":
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        
        user_id_str = payload.get("sub")
        if user_id_str is None: 
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
        user = user_service.get_user_by_id(db, ObjectId(user_id_str))
        if user is None: 
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Could not validate credentials: {e}")


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: Database = Depends(get_db)) -> Any:
    user_in.username = user_in.username.lower()
    user_in.email = user_in.email.lower()
    if user_service.get_user_by_email(db, email=user_in.email):
        raise HTTPException(status_code=409, detail="A user with this email already exists.")
    if user_service.get_user_by_username(db, username=user_in.username):
        raise HTTPException(status_code=409, detail="A user with this username already exists.")
    
    user_in.status = "inactive" # All public registrations must be approved
    
    user = user_service.create(db, obj_in=user_in)
    return {"message": "Registration successful. Please wait for admin approval."}


@router.post("/accept-invite", status_code=status.HTTP_200_OK)
async def accept_invitation(
    invite_data: AcceptInviteSchema,
    db: Database = Depends(get_db)
) -> Any:
    try:
        activated_user = user_service.activate_invited_user(
            db=db,
            token=invite_data.token,
            new_password=invite_data.new_password
        )
        return {"message": "Account activated successfully. You can now log in."}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")


@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: UserInDB = Depends(get_user_from_refresh_token)) -> Any:
    if current_user.status != "active":
        raise HTTPException(status_code=403, detail="ACCOUNT_INACTIVE")
    
    context_org_id = str(current_user.organization_id) if current_user.organization_id else str(current_user.id)
    
    new_payload = {
        "id": str(current_user.id),
        "role": current_user.role,
        "org_id": context_org_id,
        "org_role": current_user.organization_role
    }

    new_access_token = security.create_access_token(data=new_payload)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    cookie_domain = ".haveri.tech" if settings.ENVIRONMENT != "development" else None
    response.delete_cookie(
        key="refresh_token", 
        httponly=True, 
        secure=settings.ENVIRONMENT != "development", 
        samesite="lax",
        domain=cookie_domain
    )
    return {"message": "Logged out successfully"}


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(password_data: ChangePasswordSchema, current_user: UserInDB = Depends(get_current_user), db: Database = Depends(get_db)):
    user_service.change_password(db, str(current_user.id), password_data.old_password, password_data.new_password)
    return {"message": "Password updated successfully"}


# ========== PASSWORD RESET ENDPOINTS ==========
@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Database = Depends(get_db)
):
    """
    Send password reset email to user.
    """
    # Find user by email
    user = db.users.find_one({"email": request.email})
    if not user:
        # For security, don't reveal if email exists
        return {"message": "Nëse email-i ekziston, do të merrni një link për rivendosje."}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    token_expiry = datetime.utcnow() + timedelta(hours=24)
    
    # Store token in database
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_password_token": reset_token,
            "reset_password_expiry": token_expiry
        }}
    )
    
    # Build reset link
    reset_link = f"https://www.haveri.tech/reset-password?token={reset_token}"
    
    # Send email with reset link
    user_name = user.get("first_name", "") or user.get("username", "")
    send_password_reset_email_sync(request.email, reset_link, user_name)
    
    return {"message": "Nëse email-i ekziston, do të merrni një link për rivendosje."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    db: Database = Depends(get_db)
):
    """
    Reset password using valid token.
    """
    # Find user by reset token
    user = db.users.find_one({
        "reset_password_token": request.token,
        "reset_password_expiry": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(
            status_code=400,
            detail="Token i pavlefshëm ose i skaduar."
        )
    
    # Hash new password
    hashed_password = security.get_password_hash(request.password)
    
    # Update user password and clear reset token
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "hashed_password": hashed_password,
            "reset_password_token": None,
            "reset_password_expiry": None
        }}
    )
    
    return {"message": "Fjalëkalimi u rivendos me sukses."}