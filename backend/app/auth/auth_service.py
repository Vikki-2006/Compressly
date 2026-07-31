import hmac
import hashlib
import base64
import json
import time
import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.repository.user_repo import UserRepository
from app.models.user import UserModel

SECRET_KEY = "compressly-super-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def base64url_encode(data: bytes) -> str:
    """Encode bytes to base64url string."""
    return base64.urlsafe_b64encode(data).decode('utf-8').replace('=', '')

def base64url_decode(data: str) -> bytes:
    """Decode base64url string to bytes."""
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def hash_password(password: str) -> str:
    """Hash password securely using PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt, 
        100000 # iterations
    )
    return salt.hex() + "." + key.hex()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against its hash securely."""
    try:
        parts = hashed_password.split(".")
        if len(parts) != 2:
            return False
        salt = bytes.fromhex(parts[0])
        key = bytes.fromhex(parts[1])
        new_key = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode('utf-8'), 
            salt, 
            100000
        )
        return hmac.compare_digest(key, new_key)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[int] = None) -> str:
    """Generate a standards-compliant JWT access token."""
    payload = data.copy()
    if expires_delta:
        expire = int(time.time()) + expires_delta
    else:
        expire = int(time.time()) + (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        
    payload.update({"exp": expire})
    
    header = {"alg": ALGORITHM, "typ": "JWT"}
    header_json = json.dumps(header).encode('utf-8')
    payload_json = json.dumps(payload).encode('utf-8')
    
    unsigned_token = base64url_encode(header_json) + "." + base64url_encode(payload_json)
    signature = hmac.new(SECRET_KEY.encode('utf-8'), unsigned_token.encode('utf-8'), hashlib.sha256).digest()
    
    return unsigned_token + "." + base64url_encode(signature)

def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")
        
    unsigned_token = parts[0] + "." + parts[1]
    signature = base64url_decode(parts[2])
    
    expected_signature = hmac.new(SECRET_KEY.encode('utf-8'), unsigned_token.encode('utf-8'), hashlib.sha256).digest()
    
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("Signature verification failed")
        
    payload = json.loads(base64url_decode(parts[1]).decode('utf-8'))
    if "exp" in payload and payload["exp"] < time.time():
        raise ValueError("Token has expired")
        
    return payload

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserModel:
    """FastAPI dependency to retrieve authenticated user context from token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    repo = UserRepository(db)
    user = repo.get_by_username(username)
    if user is None:
        raise credentials_exception
    return user
