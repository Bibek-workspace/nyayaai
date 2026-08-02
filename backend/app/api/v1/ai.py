"""AI-powered endpoints: precedent search + on-demand summarization."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas import PrecedentSearchRequest, PrecedentSearchResponse
from app.services.ai import precedent_search, summarize_document

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/precedent-search", response_model=PrecedentSearchResponse)
async def search_precedents(
    body: PrecedentSearchRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await precedent_search(db, body.query, body.top_k)


@router.post("/documents/{document_id}/summarize")
async def summarize(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    if not doc.extracted_text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Document has no extracted text")
    doc.ai_summary = await summarize_document(doc.extracted_text)
    await db.commit()
    return {"summary": doc.ai_summary}
