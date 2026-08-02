"""Auth endpoints: register, login, refresh, me."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserPublic,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    print("========== REGISTER DEBUG ==========")
    print("TYPE:", type(body.password))
    print("VALUE:", repr(body.password))
    print("LENGTH:", len(str(body.password)))
    print("===================================")

    existing = await db.execute(
        select(User).where(User.email == body.email)
    )

    if existing.scalar_one_or_none():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Email already registered",
        )

    user = User(
        email=body.email,
        full_name=body.full_name,
        phone=body.phone,
        hashed_password=hash_password(body.password),
        role=body.role,
        bar_council_id=body.bar_council_id,
        court_id=body.court_id,
        designation=body.designation,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        user=UserPublic.model_validate(user),
        tokens=TokenPair(
            access_token=create_access_token(
                user.id,
                user.role.value,
            ),
            refresh_token=create_refresh_token(
                user.id,
            ),
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == body.email)
    )

    user = result.scalar_one_or_none()

    if not user or not verify_password(
        body.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Account is disabled",
        )

    return AuthResponse(
        user=UserPublic.model_validate(user),
        tokens=TokenPair(
            access_token=create_access_token(
                user.id,
                user.role.value,
            ),
            refresh_token=create_refresh_token(
                user.id,
            ),
        ),
    )


@router.post("/login/oauth", response_model=TokenPair, include_in_schema=False)
async def login_oauth_form(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 password-flow shim so the Swagger Authorize button works."""

    result = await db.execute(
        select(User).where(User.email == form.username)
    )

    user = result.scalar_one_or_none()

    if not user or not verify_password(
        form.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid credentials",
        )

    return TokenPair(
        access_token=create_access_token(
            user.id,
            user.role.value,
        ),
        refresh_token=create_refresh_token(
            user.id,
        ),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = decode_token(body.refresh_token)

        if payload.get("type") != "refresh":
            raise JWTError("not a refresh token")

        user_id = UUID(payload["sub"])

    except (JWTError, ValueError, KeyError):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid refresh token",
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "User not available",
        )

    return TokenPair(
        access_token=create_access_token(
            user.id,
            user.role.value,
        ),
        refresh_token=create_refresh_token(
            user.id,
        ),
    )


@router.get("/me", response_model=UserPublic)
async def me(
    current: User = Depends(get_current_user),
):
    return UserPublic.model_validate(current)