# FILE: backend/app/core/security.py
# PHOENIX PROTOCOL - SECURITY CORE V2.0 (JWT STANDARDIZATION)
# 1. BUGFIX: Corrected the `create_access_token` and `create_refresh_token` functions to resolve the root cause of the 401 Unauthorized error.
# 2. ARCHITECTURE: Enforced JWT standards by using the input 'id' to create the standard 'sub' (subject) claim and then removing the ambiguous, non-standard 'id' claim from the payload before encoding.
# 3. ROBUSTNESS: Eliminates any potential for claim collision or misinterpretation by ensuring the final token has a single, authoritative source for the user identifier.

from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError

from fastapi import HTTPException, status
from ..core.config import settings

# --- Password Hashing Context ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if the plain password matches the hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes the plain password."""
    return pwd_context.hash(password)

# --- JWT Token Functions ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token according to RFC 7519 standards."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    user_id = to_encode.pop("id", None)
    if not user_id or not isinstance(user_id, str):
        raise ValueError("User ID ('id') must be provided in the data payload and must be a string")
    
    to_encode.update({
        "exp": expire, 
        "sub": user_id, 
        "type": "access"
    })
    
    if not settings.SECRET_KEY:
        raise ValueError("SECRET_KEY is not configured")
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT refresh token according to RFC 7519 standards."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
        
    user_id = to_encode.pop("id", None)
    if not user_id or not isinstance(user_id, str):
        raise ValueError("User ID ('id') must be provided in the data payload and must be a string")
    
    to_encode.update({
        "exp": expire, 
        "sub": user_id, 
        "type": "refresh"
    })
    
    if not settings.SECRET_KEY:
        raise ValueError("SECRET_KEY is not configured")
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def decode_token(token: str) -> dict[str, Any]:
    """
    Decodes and verifies a JWT token, relying on the JOSE library for correct validation.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token must be a non-empty string",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not settings.SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error: SECRET_KEY not set",
        )
    
    try:
        return jwt.decode(
            token, 
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )