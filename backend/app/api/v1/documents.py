"""Document endpoints — upload, list, summarize, fetch download URL.

Upload flow:
  1. Accept multipart file.
  2. SHA256-dedupe — if a doc with the same hash already exists for this
     uploader, reuse it instead of double-storing.
  3. Push raw bytes to S3.
  4. Extract text (PDF native → OCR fallback; DOCX direct).
  5. Persist Document row.
  6. Schedule chunk + embed in a background task so the upload response
     returns fast.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import AsyncSessionLocal, get_db
from app.models.document import Document
from app.models.enums import DocumentKind, UserRole
from app.models.user import User
from app.schemas import DocumentOut
from app.services.ai import index_document, summarize_document
from app.services.storage import get_storage
from app.services.text_extraction import extract_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME_PREFIXES = (
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml",
    "application/msword",
    "text/",
    "image/",
)
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


async def _post_upload_pipeline(document_id: UUID):
    """Background task: chunk + embed, then summarize."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc or not doc.extracted_text:
            return
        try:
            n = await index_document(db, doc)
            logger.info("Indexed %d chunks for doc %s", n, document_id)
            doc.ai_summary = await summarize_document(doc.extracted_text)
            await db.commit()
        except Exception:
            logger.exception("post-upload pipeline failed for %s", document_id)
            await db.rollback()


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    case_id: UUID | None = Form(default=None),
    kind: DocumentKind = Form(default=DocumentKind.OTHER),
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not any(file.content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Mime type {file.content_type} not allowed",
        )

    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {MAX_UPLOAD_BYTES // (1024*1024)} MB limit",
        )

    storage = get_storage()
    sha = storage.sha256_of(data)

    # Dedupe per uploader
    dup = await db.execute(
        select(Document).where(
            Document.uploader_id == current.id, Document.sha256 == sha
        )
    )
    existing = dup.scalar_one_or_none()
    if existing:
        return DocumentOut.model_validate(existing)

    key = storage.make_key(str(current.id), file.filename or "upload.bin")
    storage.upload(data, key, file.content_type)

    extraction = extract_text(data, file.filename or "", file.content_type)

    doc = Document(
        case_id=case_id,
        uploader_id=current.id,
        filename=file.filename or "upload.bin",
        mime_type=file.content_type,
        size_bytes=len(data),
        storage_key=key,
        sha256=sha,
        kind=kind,
        extracted_text=extraction.text or None,
        ocr_performed=extraction.ocr_used,
        doc_metadata={"original_size": len(data)},
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Index + summarize asynchronously
    if doc.extracted_text:
        background.add_task(_post_upload_pipeline, doc.id)

    return DocumentOut.model_validate(doc)


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    case_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    stmt = select(Document).order_by(Document.created_at.desc())
    if case_id:
        stmt = stmt.where(Document.case_id == case_id)
    if current.role not in {UserRole.ADMIN, UserRole.CLERK, UserRole.JUDGE}:
        stmt = stmt.where(Document.uploader_id == current.id)
    result = await db.execute(stmt.limit(200))
    return [DocumentOut.model_validate(d) for d in result.scalars().all()]


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}/download-url")
async def download_url(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    url = get_storage().presigned_url(doc.storage_key, expires_in=600)
    return {"url": url, "expires_in_seconds": 600}
