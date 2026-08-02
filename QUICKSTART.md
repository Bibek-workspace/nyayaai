# NyayaAI Quickstart

## 1. Unzip and configure

```bash
unzip nyayaai-fullstack.zip
cd nyayaai

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Edit `backend/.env`:
- `JWT_SECRET_KEY` → `openssl rand -hex 32`
- `OPENAI_API_KEY` → your real key (required for AI features)

## 2. Start the stack

```bash
docker-compose up -d
```

This brings up: Postgres+pgvector, Redis, MinIO (local S3), backend, frontend.

## 3. Run migrations + seed demo users

```bash
docker-compose exec backend alembic upgrade head
docker-compose exec backend python -m app.scripts.seed
```

## 4. Visit

| URL | What |
|-----|------|
| http://localhost:3000 | Frontend |
| http://localhost:8000/docs | API Swagger UI |
| http://localhost:9001 | MinIO console (minio_admin / minio_admin_pwd) |

## 5. Log in

Six demo accounts, all with password `Demo@1234`:

- judge@nyayaai.in
- lawyer@nyayaai.in
- litigant@nyayaai.in
- clerk@nyayaai.in
- prosecutor@nyayaai.in
- admin@nyayaai.in

## Common commands

```bash
# Tail backend logs
docker-compose logs -f backend

# Reset everything (drops data)
docker-compose down -v

# Backend shell
docker-compose exec backend bash

# Frontend rebuild after dep change
docker-compose up -d --build frontend
```

## Next steps

- Deploy: see `docs/DEPLOYMENT.md`
- Architecture: see `docs/ARCHITECTURE.md`
- Backend internals: `backend/README.md`
- Frontend internals: `frontend/README.md`
