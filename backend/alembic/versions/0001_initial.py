"""Initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-01-15 10:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

from app.core.config import settings

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Vector extension creation removed due to system limitation
    # op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ── Enums ────────────────────────────────────────────── (created manually before migration)
    # Types are now created outside of alembic to avoid conflicts
    # op.execute("""CREATE TYPE user_role AS ENUM (
    #     'judge','lawyer','litigant','clerk','prosecutor','admin')""")
    # op.execute("""CREATE TYPE case_status AS ENUM (
    #     'filed','registered','notice_issued','pleadings','evidence',
    #     'arguments','judgment_reserved','disposed','appealed')""")
    # op.execute("""CREATE TYPE case_category AS ENUM (
    #     'civil','criminal','family','constitutional','commercial',
    #     'labour','tax','other')""")
    # op.execute("""CREATE TYPE document_kind AS ENUM (
    #     'petition','affidavit','evidence','judgment','order',
    #     'notice','precedent','other')""")
    # op.execute("""CREATE TYPE hearing_status AS ENUM (
    #     'scheduled','completed','adjourned','cancelled')""")
    # op.execute("""CREATE TYPE notification_channel AS ENUM (
    #     'in_app','email','sms')""")

    # ── Users ──────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("phone", sa.String(20), unique=True, nullable=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("judge","lawyer","litigant","clerk","prosecutor","admin",
                                  name="user_role", create_type=False), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("bar_council_id", sa.String(100)),
        sa.Column("court_id", sa.String(100)),
        sa.Column("designation", sa.String(100)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # ── Cases ──────────────────────────────────────────────
    op.create_table(
        "cases",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_number", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("category", sa.Enum(name="case_category", create_type=False), nullable=False),
        sa.Column("status", sa.Enum(name="case_status", create_type=False), nullable=False, server_default="filed"),
        sa.Column("filed_on", sa.Date(), nullable=False),
        sa.Column("court_name", sa.String(255), nullable=False),
        sa.Column("jurisdiction", sa.String(255)),
        sa.Column("filer_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("judge_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_cases_status_category", "cases", ["status", "category"])

    op.create_table(
        "case_parties",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("role_in_case", sa.String(50), nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "case_status_history",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.Enum(name="case_status", create_type=False)),
        sa.Column("to_status", sa.Enum(name="case_status", create_type=False), nullable=False),
        sa.Column("changed_by_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "hearings",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("courtroom", sa.String(100)),
        sa.Column("purpose", sa.String(255), nullable=False),
        sa.Column("status", sa.Enum(name="hearing_status", create_type=False),
                  nullable=False, server_default="scheduled"),
        sa.Column("notes", sa.Text()),
        sa.Column("next_hearing_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("hearings.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_hearings_case_scheduled", "hearings", ["case_id", "scheduled_at"])

    # ── Documents ──────────────────────────────────────────
    op.create_table(
        "documents",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("cases.id", ondelete="CASCADE"), index=True),
        sa.Column("uploader_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(1000), nullable=False, unique=True),
        sa.Column("sha256", sa.String(64), nullable=False, index=True),
        sa.Column("kind", sa.Enum(name="document_kind", create_type=False),
                  nullable=False, server_default="other"),
        sa.Column("extracted_text", sa.Text()),
        sa.Column("ocr_performed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("ai_summary", sa.Text()),
        sa.Column("doc_metadata", sa.dialects.postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "document_chunks",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", sa.dialects.postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_document_chunks_document", "document_chunks", ["document_id"])

    # Note: Vector similarity index removed due to pgvector unavailability
    # Will be added later if pgvector is properly installed

    # ── Notifications ──────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("channel", sa.Enum(name="notification_channel", create_type=False),
                  nullable=False, server_default="in_app"),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("link_url", sa.String(1000)),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.false(), index=True),
        sa.Column("payload", sa.dialects.postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_index("ix_document_chunks_document", table_name="document_chunks")
    op.drop_table("document_chunks")
    op.drop_table("documents")
    op.drop_index("ix_hearings_case_scheduled", table_name="hearings")
    op.drop_table("hearings")
    op.drop_table("case_status_history")
    op.drop_table("case_parties")
    op.drop_index("ix_cases_status_category", table_name="cases")
    op.drop_table("cases")
    op.drop_table("users")
    # Types are managed manually, not dropped here
    # for t in ("notification_channel","hearing_status","document_kind",
    #           "case_category","case_status","user_role"):
    #     op.execute(f"DROP TYPE IF EXISTS {t}")
