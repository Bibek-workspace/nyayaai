"""FastAPI dependencies — current user + role-based access control."""
from typing import Iterable
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=True)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exc
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise credentials_exc
    return user


def require_roles(*allowed: UserRole):
    """Dependency factory: only allow these roles through."""
    allowed_set = set(allowed)

    async def _gate(current: User = Depends(get_current_user)) -> User:
        if current.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current.role.value}' is not authorised for this action",
            )
        return current

    return _gate


# Convenience pre-built gates
require_admin = require_roles(UserRole.ADMIN)
require_judge = require_roles(UserRole.JUDGE)
require_court_staff = require_roles(UserRole.JUDGE, UserRole.CLERK, UserRole.ADMIN)
require_legal_pro = require_roles(UserRole.LAWYER, UserRole.PROSECUTOR, UserRole.JUDGE, UserRole.ADMIN)
