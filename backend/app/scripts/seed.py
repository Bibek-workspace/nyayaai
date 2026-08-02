"""Seed demo data: one user per role.

Run inside the backend container:
    python -m app.scripts.seed
"""
import asyncio
import logging

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

DEMO_USERS = [
    ("judge@nyayaai.in",      "Justice Mehta",     UserRole.JUDGE,      {"court_id": "DEL-HC-04", "designation": "Senior Judge"}),
    ("lawyer@nyayaai.in",     "Adv. Rao",          UserRole.LAWYER,     {"bar_council_id": "MH/12345/2019"}),
    ("litigant@nyayaai.in",   "Ravi Kumar",        UserRole.LITIGANT,   {}),
    ("clerk@nyayaai.in",      "Sneha Iyer",        UserRole.CLERK,      {"court_id": "DEL-HC-04"}),
    ("prosecutor@nyayaai.in", "P.P. Verma",        UserRole.PROSECUTOR, {"designation": "Public Prosecutor"}),
    ("admin@nyayaai.in",      "System Admin",      UserRole.ADMIN,      {}),
]
DEMO_PASSWORD = "Demo@1234"


async def seed():
    async with AsyncSessionLocal() as db:
        created = 0
        for email, name, role, extras in DEMO_USERS:
            existing = await db.execute(select(User).where(User.email == email))
            if existing.scalar_one_or_none():
                logger.info("✓ %s already present", email)
                continue
            db.add(User(
                email=email,
                full_name=name,
                role=role,
                hashed_password=hash_password(DEMO_PASSWORD),
                is_active=True,
                is_verified=True,
                **extras,
            ))
            created += 1
            logger.info("+ %s (%s)", email, role.value)
        await db.commit()
        logger.info("Done. %d new users.", created)


if __name__ == "__main__":
    asyncio.run(seed())
