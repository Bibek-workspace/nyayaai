# Backend

FastAPI service. See top-level [README](../README.md) and
[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the full picture.

## Run locally (without Docker)

```bash
# Postgres + Redis must be running separately
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit values
alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload
```

## Folder map

```
app/
├── api/v1/         REST route handlers, grouped by domain
├── core/           Config, security primitives, FastAPI deps
├── db/             Async SQLAlchemy session + declarative base
├── models/         ORM classes
├── schemas/        Pydantic request/response DTOs
├── services/       Business logic (AI, files, notifications, storage)
├── scripts/        One-off scripts (seed, etc.)
└── main.py         App entrypoint
```

## Common tasks

```bash
# Create a new migration after editing models
alembic revision --autogenerate -m "your message"

# Run tests
pytest

# Lint
ruff check app

# Open an async psql shell against the running container
docker-compose exec postgres psql -U nyayaai
```
