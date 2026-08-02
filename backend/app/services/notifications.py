"""Notification dispatch: in-app DB record + optional email/SMS."""
from __future__ import annotations

import logging
from uuid import UUID

import aiosmtplib
from email.message import EmailMessage
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import NotificationChannel
from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)

_twilio_client = None


def _get_twilio():
    global _twilio_client
    if _twilio_client is None and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        from twilio.rest import Client
        _twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    return _twilio_client


async def _send_email(to: str, subject: str, body_text: str, body_html: str | None = None) -> bool:
    if not settings.SMTP_HOST:
        logger.info("[email mock] To=%s | %s", to, subject)
        return True
    msg = EmailMessage()
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        return True
    except Exception as e:
        logger.exception("Email send failed: %s", e)
        return False


def _send_sms(to: str, body: str) -> bool:
    client = _get_twilio()
    if not client or not settings.TWILIO_FROM_NUMBER:
        logger.info("[sms mock] To=%s | %s", to, body)
        return True
    try:
        client.messages.create(body=body, from_=settings.TWILIO_FROM_NUMBER, to=to)
        return True
    except Exception as e:
        logger.exception("SMS send failed: %s", e)
        return False


async def notify_user(
    db: AsyncSession,
    user: User,
    title: str,
    body: str,
    link_url: str | None = None,
    channels: list[NotificationChannel] | None = None,
    payload: dict | None = None,
) -> Notification:
    """Persist an in-app notification and optionally fan out to email/SMS."""
    channels = channels or [NotificationChannel.IN_APP]
    payload = payload or {}

    record = Notification(
        user_id=user.id,
        channel=NotificationChannel.IN_APP,
        title=title,
        body=body,
        link_url=link_url,
        payload=payload,
    )
    db.add(record)
    await db.flush()

    if NotificationChannel.EMAIL in channels and user.email:
        await _send_email(user.email, title, body)
    if NotificationChannel.SMS in channels and user.phone:
        _send_sms(user.phone, f"{title}: {body}")

    return record
