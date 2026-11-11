
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
import jwt
import os

from backend.app.database import users_collection
from backend.app.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"


# Registration request model
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


# Login request model
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# User registration API
@router.post("/register")
def register(user: RegisterRequest):

    if len(user.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters"
        )

    existing_user = users_collection.find_one(
        {"email": user.email}
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "created_at": datetime.now(timezone.utc)
    }

    users_collection.insert_one(new_user)

    return {
        "message": "Registration successful"
    }


# User login API
@router.post("/login")
def login(user: LoginRequest):

    if not SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="JWT_SECRET_KEY is not configured"
        )

    existing_user = users_collection.find_one(
        {"email": user.email}
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        existing_user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = jwt.encode(
        {
            "sub": str(existing_user["_id"]),
            "exp": datetime.now(timezone.utc) + timedelta(hours=24)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
    "message": "Login successful",
    "access_token": token,
    "token_type": "bearer",
    "user": {
        "name": existing_user["name"],
        "email": existing_user["email"]
    }
}
