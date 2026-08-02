"""Admin-only endpoints — user management + system analytics."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.case import Case, Hearing
from app.models.document import Document
from app.models.enums import CaseStatus, UserRole
from app.models.user import User
from app.schemas.auth import UserPublic

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[UserPublic])
async def list_users(
    role: UserRole | None = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).order_by(User.created_at.desc())
    if role:
        stmt = stmt.where(User.role == role)
    result = await db.execute(stmt.limit(500))
    return [UserPublic.model_validate(u) for u in result.scalars().all()]


@router.post("/users/{user_id}/toggle-active", response_model=UserPublic)
async def toggle_active(user_id: UUID, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return UserPublic.model_validate(user)


@router.post("/users/{user_id}/verify", response_model=UserPublic)
async def verify_user(user_id: UUID, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    user.is_verified = True
    await db.commit()
    await db.refresh(user)
    return UserPublic.model_validate(user)


@router.get("/analytics")
async def system_analytics(db: AsyncSession = Depends(get_db)):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    users_by_role = {
        r.value: c for r, c in (await db.execute(
            select(User.role, func.count()).group_by(User.role)
        )).all()
    }
    total_cases = (await db.execute(select(func.count()).select_from(Case))).scalar_one()
    cases_by_status = {
        s.value: c for s, c in (await db.execute(
            select(Case.status, func.count()).group_by(Case.status)
        )).all()
    }
    pending_cases = sum(
        v for k, v in cases_by_status.items()
        if k not in {CaseStatus.DISPOSED.value, CaseStatus.APPEALED.value}
    )
    total_hearings = (await db.execute(select(func.count()).select_from(Hearing))).scalar_one()
    total_documents = (await db.execute(select(func.count()).select_from(Document))).scalar_one()

    return {
        "users": {"total": total_users, "by_role": users_by_role},
        "cases": {
            "total": total_cases,
            "by_status": cases_by_status,
            "pending": pending_cases,
            "disposed": cases_by_status.get(CaseStatus.DISPOSED.value, 0),
        },
        "hearings": {"total": total_hearings},
        "documents": {"total": total_documents},
    }
