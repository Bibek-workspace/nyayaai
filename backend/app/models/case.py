"""Case-related models: Case, Hearing, CaseParty."""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import CaseCategory, CaseStatus, HearingStatus


class Case(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "cases"
    __table_args__ = (
        Index("ix_cases_status_category", "status", "category"),
    )

    case_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[CaseCategory] = mapped_column(
        Enum(CaseCategory, name="case_category"), nullable=False, index=True
    )
    status: Mapped[CaseStatus] = mapped_column(
        Enum(CaseStatus, name="case_status"),
        default=CaseStatus.FILED,
        nullable=False,
        index=True,
    )

    filed_on: Mapped[date] = mapped_column(Date, nullable=False)
    court_name: Mapped[str] = mapped_column(String(255), nullable=False)
    jurisdiction: Mapped[str | None] = mapped_column(String(255), nullable=True)

    filer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    judge_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    filer = relationship("User", back_populates="cases_filed", foreign_keys=[filer_id])
    judge = relationship("User", back_populates="cases_judged", foreign_keys=[judge_id])
    hearings = relationship("Hearing", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    parties = relationship("CaseParty", back_populates="case", cascade="all, delete-orphan")
    history = relationship(
        "CaseStatusHistory", back_populates="case", cascade="all, delete-orphan",
        order_by="CaseStatusHistory.created_at",
    )


class CaseParty(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Petitioners, respondents, witnesses, etc. attached to a case."""
    __tablename__ = "case_parties"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    role_in_case: Mapped[str] = mapped_column(String(50), nullable=False)  # petitioner, respondent, witness
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)

    case = relationship("Case", back_populates="parties")


class CaseStatusHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Append-only audit log of every state transition."""
    __tablename__ = "case_status_history"

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[CaseStatus | None] = mapped_column(
        Enum(CaseStatus, name="case_status"), nullable=True
    )
    to_status: Mapped[CaseStatus] = mapped_column(
        Enum(CaseStatus, name="case_status"), nullable=False
    )
    changed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    case = relationship("Case", back_populates="history")


class Hearing(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "hearings"
    __table_args__ = (
        Index("ix_hearings_case_scheduled", "case_id", "scheduled_at"),
    )

    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(default=30, nullable=False)
    courtroom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[HearingStatus] = mapped_column(
        Enum(HearingStatus, name="hearing_status"),
        default=HearingStatus.SCHEDULED, nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_hearing_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hearings.id", ondelete="SET NULL"), nullable=True
    )

    case = relationship("Case", back_populates="hearings")
