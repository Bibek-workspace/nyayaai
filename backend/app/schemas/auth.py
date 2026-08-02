"""Authentication request/response schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole
    bar_council_id: str | None = None
    court_id: str | None = None
    designation: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None
    role: UserRole
    is_active: bool
    is_verified: bool
    bar_council_id: str | None
    court_id: str | None
    designation: str | None
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserPublic
    tokens: TokenPair
