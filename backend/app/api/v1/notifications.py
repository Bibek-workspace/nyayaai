"""Notification list + mark-as-read endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
async def list_my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    stmt = select(Notification).where(Notification.user_id == current.id)
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return [NotificationOut.model_validate(n) for n in result.scalars().all()]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    n = await db.get(Notification, notification_id)
    if not n or n.user_id != current.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    n.read = True
    await db.commit()
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current.id, Notification.read.is_(False))
        .values(read=True)
    )
    await db.commit()
    return {"ok": True}
