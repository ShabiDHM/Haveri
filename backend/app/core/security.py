# FILE: backend/app/core/security.py
# PHOENIX PROTOCOL - SECURITY CORE V3.0 (PASSLIB BYPASS)
# 1. FIX: Completely bypassed legacy passlib to eliminate the 72-byte bcrypt bug on Python 3.13.
# 2. OPTIMIZATION: Implemented native high-performance bcrypt hashing.
# 3. STATUS: Clean, Fully Robust & Production Ready.

import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError

from fastapi import HTTPException, status
from ..core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks if the plain password matches the hashed password using native bcrypt."""
    try:
        # bcrypt requires byte-encoded inputs for verification
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hashes the plain password using native bcrypt."""
    # Generate salt and compute hash safely on Python 3.13
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

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