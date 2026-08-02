"""Document storage + vector chunks for RAG."""
import uuid

from sqlalchemy import BigInteger, Enum, ForeignKey, Integer, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import DocumentKind


class Document(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A file uploaded to the system. May or may not be tied to a Case."""
    __tablename__ = "documents"

    case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True
    )
    uploader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1000), nullable=False, unique=True)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    kind: Mapped[DocumentKind] = mapped_column(
        Enum(DocumentKind, name="document_kind"),
        default=DocumentKind.OTHER, nullable=False,
    )

    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_performed: Mapped[bool] = mapped_column(default=False, nullable=False)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    doc_metadata: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    case = relationship("Case", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A semantic chunk of a document, with its embedding vector."""
    __tablename__ = "document_chunks"
    __table_args__ = (
        # IVFFlat index is added via Alembic migration after table exists.
        Index("ix_document_chunks_document", "document_id"),
    )

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(JSONB, nullable=False, default=list)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)

    document = relationship("Document", back_populates="chunks")
