"""Hearing scheduling endpoints.

Includes a naïve next-hearing prediction: average gap between past hearings
for the case, clamped to [7, 45] days. Real-world replacement would feed
historical case data into an ML model.
"""
from datetime import datetime, timedelta, timezone
from statistics import mean
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, require_court_staff
from app.db.session import get_db
from app.models.case import Case, Hearing
from app.models.enums import HearingStatus
from app.models.user import User
from app.schemas import HearingCreate, HearingOut, HearingUpdate

router = APIRouter(prefix="/hearings", tags=["hearings"])


@router.post("", response_model=HearingOut, status_code=status.HTTP_201_CREATED)
async def schedule_hearing(
    body: HearingCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_court_staff),
):
    case = await db.get(Case, body.case_id)
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")

    # Conflict check — same courtroom, overlapping interval
    if body.courtroom:
        end = body.scheduled_at + timedelta(minutes=body.duration_minutes)
        conflict = await db.execute(
            select(Hearing).where(
                Hearing.courtroom == body.courtroom,
                Hearing.status == HearingStatus.SCHEDULED,
                Hearing.scheduled_at < end,
                Hearing.scheduled_at + timedelta(minutes=Hearing.duration_minutes) > body.scheduled_at,
            )
        )
        # Note: SQL `+ interval` on a column isn't fully expressible cross-DB
        # via SQLAlchemy ORM in this concise form. For production, replace
        # with a TSRANGE column + EXCLUDE constraint or an explicit raw SQL.
        if conflict.first():
            raise HTTPException(status.HTTP_409_CONFLICT, "Courtroom occupied at that time")

    hearing = Hearing(
        case_id=body.case_id,
        scheduled_at=body.scheduled_at,
        duration_minutes=body.duration_minutes,
        courtroom=body.courtroom,
        purpose=body.purpose,
        status=HearingStatus.SCHEDULED,
    )
    db.add(hearing)
    await db.commit()
    await db.refresh(hearing)
    return HearingOut.model_validate(hearing)


@router.get("", response_model=list[HearingOut])
async def list_hearings(
    case_id: UUID | None = None,
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Hearing).order_by(Hearing.scheduled_at)
    conds = []
    if case_id:
        conds.append(Hearing.case_id == case_id)
    if from_date:
        conds.append(Hearing.scheduled_at >= from_date)
    if to_date:
        conds.append(Hearing.scheduled_at <= to_date)
    if conds:
        stmt = stmt.where(and_(*conds))
    result = await db.execute(stmt.limit(500))
    return [HearingOut.model_validate(h) for h in result.scalars().all()]


@router.patch("/{hearing_id}", response_model=HearingOut)
async def update_hearing(
    hearing_id: UUID,
    body: HearingUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_court_staff),
):
    hearing = await db.get(Hearing, hearing_id)
    if not hearing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hearing not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(hearing, k, v)
    await db.commit()
    await db.refresh(hearing)
    return HearingOut.model_validate(hearing)


@router.get("/predict-next/{case_id}")
async def predict_next_hearing(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Average gap between past completed hearings for this case, clamped 7–45 days."""
    result = await db.execute(
        select(Hearing)
        .where(Hearing.case_id == case_id, Hearing.status == HearingStatus.COMPLETED)
        .order_by(Hearing.scheduled_at)
    )
    past = list(result.scalars().all())
    if len(past) < 2:
        gap = 21  # heuristic default
        confidence = 0.4
    else:
        gaps = [(past[i].scheduled_at - past[i-1].scheduled_at).days for i in range(1, len(past))]
        gap = int(max(7, min(45, mean(gaps))))
        confidence = round(min(0.95, 0.5 + 0.05 * len(gaps)), 2)

    anchor = past[-1].scheduled_at if past else datetime.now(timezone.utc)
    return {
        "case_id": str(case_id),
        "predicted_date": (anchor + timedelta(days=gap)).date().isoformat(),
        "based_on_hearings": len(past),
        "confidence": confidence,
    }
