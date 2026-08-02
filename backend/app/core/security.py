"""Password hashing and JWT token handling."""
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
print("SECURITY.PY LOADED")


def hash_password(plain: str) -> str:
    print("====== HASH DEBUG ======")
    print("TYPE:", type(plain))
    print("LEN:", len(str(plain)))
    print("VALUE:", repr(plain))
    print("========================")

    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    print("====== VERIFY DEBUG ======")
    print("TYPE:", type(plain))
    print("LEN:", len(str(plain)))
    print("VALUE:", repr(plain))
    print("==========================")

    return pwd_context.verify(plain, hashed)


def _create_token(
    subject: str | UUID,
    expires_delta: timedelta,
    token_type: str,
    extra: dict | None = None,
) -> str:
    now = datetime.now(timezone.utc)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + expires_delta,
        "type": token_type,
    }

    if extra:
        payload.update(extra)

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_access_token(user_id: str | UUID, role: str) -> str:
    return _create_token(
        user_id,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
        {"role": role},
    )


def create_refresh_token(user_id: str | UUID) -> str:
    return _create_token(
        user_id,
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


def decode_token(token: str) -> dict[str, Any]:
    """Returns payload or raises JWTError."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
