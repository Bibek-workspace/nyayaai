import asyncio

from sqlalchemy import text

from app.db.session import engine


CREATE_USERS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    full_name TEXT NOT NULL,
    hashed_password TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_verified BOOLEAN NOT NULL DEFAULT 0,
    bar_council_id TEXT,
    court_id TEXT,
    designation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""


async def create_users_table():
    async with engine.begin() as conn:
        await conn.execute(text(CREATE_USERS_TABLE_SQL))

    print("✅ users table created successfully")


if __name__ == "__main__":
    asyncio.run(create_users_table())