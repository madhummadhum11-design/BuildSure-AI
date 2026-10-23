import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.models import UserModel
from app.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
)
from app.services import auth_service

logger = logging.getLogger("siteguard.auth.router")

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> UserModel:
    """
    Dependency that extracts, verifies, and resolves the current authenticated user from
    the HTTP Bearer JWT token in the Authorization header.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    try:
        payload = auth_service.decode_access_token(token)
        email: Optional[str] = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing subject claim.",
                headers={"WWW-Authenticate": "Bearer"}
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated."
        )

    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user account and returns an access token."""
    email_clean = payload.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A valid email address is required."
        )

    existing = db.query(UserModel).filter(UserModel.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{email_clean}' is already registered."
        )

    if len(payload.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 6 characters long."
        )

    new_user = UserModel(
        email=email_clean,
        hashed_password=auth_service.hash_password(payload.password),
        full_name=payload.full_name.strip() if payload.full_name else "Safety Officer",
        role=payload.role.strip() if payload.role else "Safety Inspector",
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = auth_service.create_access_token({"sub": new_user.email, "uid": new_user.id, "role": new_user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates credentials and returns a signed JWT access token."""
    email_clean = payload.email.strip().lower()
    user = db.query(UserModel).filter(UserModel.email == email_clean).first()

    if not user or not auth_service.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact site administrator."
        )

    token = auth_service.create_access_token({"sub": user.email, "uid": user.id, "role": user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: UserModel = Depends(get_current_user)):
    """Returns the authenticated user's current profile information."""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout_user():
    """Confirms user logout; client clears persisted JWT token from storage."""
    return {"status": "ok", "message": "Successfully logged out."}
