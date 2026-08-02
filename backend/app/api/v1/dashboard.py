"""Dashboard endpoint — single aggregated payload for the home screen."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.case import Case, CaseParty, Hearing
from app.models.enums import HearingStatus, UserRole
from app.models.notification import Notification
from app.models.user import User
from app.schemas import CaseOut, DashboardStats, HearingOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _scope_cases(stmt, user: User):
    if user.role in {UserRole.ADMIN, UserRole.CLERK}:
        return stmt
    if user.role == UserRole.JUDGE:
        return stmt.where(Case.judge_id == user.id)
    party_subq = select(CaseParty.case_id).where(CaseParty.user_id == user.id)
    return stmt.where(or_(Case.filer_id == user.id, Case.id.in_(party_subq)))


@router.get("", response_model=DashboardStats)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    # Total visible cases
    total_stmt = _scope_cases(select(func.count()).select_from(Case), current)
    total_cases = (await db.execute(total_stmt)).scalar_one()

    # By status
    status_stmt = _scope_cases(select(Case.status, func.count()).group_by(Case.status), current)
    by_status = {s.value: c for s, c in (await db.execute(status_stmt)).all()}

    # By category
    cat_stmt = _scope_cases(select(Case.category, func.count()).group_by(Case.category), current)
    by_category = {c.value: n for c, n in (await db.execute(cat_stmt)).all()}

    # Upcoming hearings — next 30 days, on cases the user can see
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=30)
    visible_case_ids = _scope_cases(select(Case.id), current).subquery()

    hearings_stmt = (
        select(Hearing)
        .where(
            Hearing.scheduled_at.between(now, horizon),
            Hearing.status == HearingStatus.SCHEDULED,
            Hearing.case_id.in_(select(visible_case_ids)),
        )
        .order_by(Hearing.scheduled_at)
        .limit(10)
    )
    upcoming_hearings = list((await db.execute(hearings_stmt)).scalars().all())

    # Unread notification count
    unread = (await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == current.id, Notification.read.is_(False)
        )
    )).scalar_one()

    # 5 most recent visible cases
    recent_stmt = _scope_cases(
        select(Case).options(selectinload(Case.parties)).order_by(Case.created_at.desc()).limit(5),
        current,
    )
    recent = list((await db.execute(recent_stmt)).scalars().unique().all())

    return DashboardStats(
        total_cases=total_cases,
        cases_by_status=by_status,
        cases_by_category=by_category,
        upcoming_hearings_count=len(upcoming_hearings),
        unread_notifications=unread,
        recent_cases=[CaseOut.model_validate(c) for c in recent],
        upcoming_hearings=[HearingOut.model_validate(h) for h in upcoming_hearings],
    )
