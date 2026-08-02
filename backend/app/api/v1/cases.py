"""Case management endpoints.

Notable design choices:
  - Case numbers are auto-generated and unique (year-sequential).
  - Status changes go through `_advance_status`, which enforces the
    transition rules from CASE_TRANSITIONS and writes an audit row.
  - List endpoint applies a role-scoped visibility filter:
      Judges see cases assigned to them.
      Lawyers/Litigants see cases they filed or are party to.
      Clerks / Admins see everything.
"""
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, require_court_staff
from app.db.session import get_db
from app.models.case import Case, CaseParty, CaseStatusHistory
from app.models.enums import CASE_TRANSITIONS, CaseStatus, UserRole
from app.models.user import User
from app.schemas import (
    CaseCreate,
    CaseHistoryOut,
    CaseOut,
    CaseStatusUpdate,
    CaseUpdate,
)

router = APIRouter(prefix="/cases", tags=["cases"])


async def _next_case_number(db: AsyncSession) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"NYA/{year}/"
    result = await db.execute(
        select(func.count()).select_from(Case).where(Case.case_number.like(f"{prefix}%"))
    )
    n = result.scalar_one() + 1
    return f"{prefix}{n:06d}"


def _can_view_case(user: User, case: Case) -> bool:
    if user.role in {UserRole.ADMIN, UserRole.CLERK}:
        return True
    if user.role == UserRole.JUDGE and case.judge_id == user.id:
        return True
    if case.filer_id == user.id:
        return True
    return any(p.user_id == user.id for p in case.parties)


@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
async def create_case(
    body: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    case = Case(
        case_number=await _next_case_number(db),
        title=body.title,
        description=body.description,
        category=body.category,
        filed_on=body.filed_on,
        court_name=body.court_name,
        jurisdiction=body.jurisdiction,
        judge_id=body.judge_id,
        filer_id=current.id,
        status=CaseStatus.FILED,
    )
    db.add(case)
    await db.flush()

    for p in body.parties:
        db.add(CaseParty(
            case_id=case.id,
            role_in_case=p.role_in_case,
            display_name=p.display_name,
            user_id=p.user_id,
        ))

    db.add(CaseStatusHistory(
        case_id=case.id,
        from_status=None,
        to_status=CaseStatus.FILED,
        changed_by_id=current.id,
        note="Case filed",
    ))

    await db.commit()
    await db.refresh(case, ["parties"])
    return CaseOut.model_validate(case)


@router.get("", response_model=list[CaseOut])
async def list_cases(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
    status_filter: CaseStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, description="search title / case number"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    stmt = select(Case).options(selectinload(Case.parties)).order_by(Case.created_at.desc())

    # Role scoping
    if current.role == UserRole.JUDGE:
        stmt = stmt.where(Case.judge_id == current.id)
    elif current.role in {UserRole.LAWYER, UserRole.LITIGANT, UserRole.PROSECUTOR}:
        # Filer OR a party
        party_subq = select(CaseParty.case_id).where(CaseParty.user_id == current.id)
        stmt = stmt.where(or_(Case.filer_id == current.id, Case.id.in_(party_subq)))

    if status_filter:
        stmt = stmt.where(Case.status == status_filter)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(Case.title.ilike(pattern), Case.case_number.ilike(pattern)))

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return [CaseOut.model_validate(c) for c in result.scalars().unique().all()]


@router.get("/{case_id}", response_model=CaseOut)
async def get_case(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Case).options(selectinload(Case.parties)).where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    if not _can_view_case(current, case):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No access to this case")
    return CaseOut.model_validate(case)


@router.patch("/{case_id}", response_model=CaseOut)
async def update_case(
    case_id: UUID,
    body: CaseUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_court_staff),
):
    result = await db.execute(
        select(Case).options(selectinload(Case.parties)).where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")

    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(case, k, v)
    await db.commit()
    await db.refresh(case, ["parties"])
    return CaseOut.model_validate(case)


@router.post("/{case_id}/status", response_model=CaseOut)
async def change_status(
    case_id: UUID,
    body: CaseStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(require_court_staff),
):
    result = await db.execute(
        select(Case).options(selectinload(Case.parties)).where(Case.id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")

    allowed = CASE_TRANSITIONS.get(case.status, set())
    if body.new_status not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid transition {case.status.value} → {body.new_status.value}. "
            f"Allowed next: {[s.value for s in allowed] or 'none (terminal state)'}",
        )

    db.add(CaseStatusHistory(
        case_id=case.id,
        from_status=case.status,
        to_status=body.new_status,
        changed_by_id=current.id,
        note=body.note,
    ))
    case.status = body.new_status
    await db.commit()
    await db.refresh(case, ["parties"])
    return CaseOut.model_validate(case)


@router.get("/{case_id}/history", response_model=list[CaseHistoryOut])
async def get_history(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    case_result = await db.execute(
        select(Case).options(selectinload(Case.parties)).where(Case.id == case_id)
    )
    case = case_result.scalar_one_or_none()
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    if not _can_view_case(current, case):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    result = await db.execute(
        select(CaseStatusHistory)
        .where(CaseStatusHistory.case_id == case_id)
        .order_by(CaseStatusHistory.created_at)
    )
    return [CaseHistoryOut.model_validate(h) for h in result.scalars().all()]
