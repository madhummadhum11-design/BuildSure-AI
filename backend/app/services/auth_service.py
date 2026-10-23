import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

import bcrypt
import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models import UserModel

logger = logging.getLogger("siteguard.auth")


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    pw_bytes = password.encode("utf-8")[:72]  # standard bcrypt length cap
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception as exc:
        logger.warning(f"Error during password verification: {exc}")
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a signed JWT access token with expiration timestamp."""
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": now_utc
    })

    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a signed JWT token. Raises PyJWT exceptions on failure."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM]
    )


def seed_demo_user(db: Session) -> Optional[UserModel]:
    """
    Seeds a reliable demo account for mentor and evaluator review if one does not exist.
    Credentials: settings.DEMO_USER_EMAIL / settings.DEMO_USER_PASSWORD.
    """
    try:
        existing = db.query(UserModel).filter(UserModel.email == settings.DEMO_USER_EMAIL).first()
        if not existing:
            demo_user = UserModel(
                email=settings.DEMO_USER_EMAIL,
                hashed_password=hash_password(settings.DEMO_USER_PASSWORD),
                full_name=settings.DEMO_USER_NAME,
                role=settings.DEMO_USER_ROLE,
                is_active=True
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            logger.info(f"Seeded demo user account: {settings.DEMO_USER_EMAIL}")
            return demo_user
        else:
            # Ensure demo account is active
            if not existing.is_active:
                existing.is_active = True
                db.commit()
            return existing
    except Exception as exc:
        logger.error(f"Failed to seed demo user: {exc}")
        db.rollback()
        return None
