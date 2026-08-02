"""Case, hearing, document, and notification schemas."""
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    CaseCategory,
    CaseStatus,
    DocumentKind,
    HearingStatus,
    NotificationChannel,
)


# ─── Cases ─────────────────────────────────────────────
class CasePartyIn(BaseModel):
    role_in_case: str = Field(min_length=2, max_length=50)
    display_name: str = Field(min_length=2, max_length=255)
    user_id: UUID | None = None


class CaseCreate(BaseModel):
    title: str = Field(min_length=5, max_length=500)
    description: str | None = None
    category: CaseCategory
    filed_on: date
    court_name: str = Field(min_length=2, max_length=255)
    jurisdiction: str | None = None
    judge_id: UUID | None = None
    parties: list[CasePartyIn] = Field(default_factory=list)


class CaseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: CaseCategory | None = None
    judge_id: UUID | None = None
    jurisdiction: str | None = None


class CaseStatusUpdate(BaseModel):
    new_status: CaseStatus
    note: str | None = None


class CasePartyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    role_in_case: str
    display_name: str
    user_id: UUID | None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_number: str
    title: str
    description: str | None
    category: CaseCategory
    status: CaseStatus
    filed_on: date
    court_name: str
    jurisdiction: str | None
    filer_id: UUID
    judge_id: UUID | None
    parties: list[CasePartyOut] = []
    created_at: datetime
    updated_at: datetime


class CaseHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    from_status: CaseStatus | None
    to_status: CaseStatus
    changed_by_id: UUID
    note: str | None
    created_at: datetime


# ─── Hearings ───────────────────────────────────────────
class HearingCreate(BaseModel):
    case_id: UUID
    scheduled_at: datetime
    duration_minutes: int = Field(default=30, ge=10, le=480)
    courtroom: str | None = None
    purpose: str = Field(min_length=2, max_length=255)


class HearingUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=10, le=480)
    courtroom: str | None = None
    purpose: str | None = None
    status: HearingStatus | None = None
    notes: str | None = None


class HearingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    case_id: UUID
    scheduled_at: datetime
    duration_minutes: int
    courtroom: str | None
    purpose: str
    status: HearingStatus
    notes: str | None


# ─── Documents ──────────────────────────────────────────
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    case_id: UUID | None
    uploader_id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    kind: DocumentKind
    ocr_performed: bool
    ai_summary: str | None
    created_at: datetime


# ─── AI Search ──────────────────────────────────────────
class PrecedentSearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)


class PrecedentHit(BaseModel):
    document_id: UUID
    filename: str
    chunk_content: str
    similarity: float
    case_id: UUID | None = None


class PrecedentSearchResponse(BaseModel):
    query: str
    answer: str
    hits: list[PrecedentHit]
    elapsed_ms: int


# ─── Notifications ──────────────────────────────────────
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    channel: NotificationChannel
    title: str
    body: str
    link_url: str | None
    read: bool
    created_at: datetime


# ─── Dashboard ──────────────────────────────────────────
class DashboardStats(BaseModel):
    total_cases: int
    cases_by_status: dict[str, int]
    cases_by_category: dict[str, int]
    upcoming_hearings_count: int
    unread_notifications: int
    recent_cases: list[CaseOut]
    upcoming_hearings: list[HearingOut]
