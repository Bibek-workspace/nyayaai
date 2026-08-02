# NyayaAI — AI-Powered Legal Case Management System

Production-grade full-stack SaaS for the Indian judicial system. Manages case lifecycles, AI-powered precedent search via RAG, scheduling, document OCR, and role-based workflows for Judges, Lawyers, Litigants, Clerks, Prosecutors, and Admins.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.11), SQLAlchemy 2.0 async, Pydantic v2 |
| Database | PostgreSQL 16 + pgvector (for embeddings) |
| Cache / Queue | Redis 7 |
| Auth | JWT (access + refresh), bcrypt, RBAC |
| AI | OpenAI GPT-4o + text-embedding-3-large, LangChain RAG |
| OCR | Tesseract + pdf2image |
| Storage | S3-compatible (AWS S3 / Cloudflare R2 / MinIO local) |
| Email | SMTP (SendGrid / AWS SES) |
| SMS | Twilio |
| Deploy | Vercel (FE), Railway/AWS ECS (BE), Docker |

## Project Layout

```
nyayaai/
├── backend/                FastAPI service
│   ├── app/
│   │   ├── api/v1/         Route handlers
│   │   ├── core/           Config, security, deps
│   │   ├── db/             Session, base
│   │   ├── models/         SQLAlchemy ORM
│   │   ├── schemas/        Pydantic DTOs
│   │   ├── services/       Business logic (AI, files, notifications)
│   │   └── utils/
│   ├── alembic/            Database migrations
│   └── tests/
├── frontend/               Next.js app
│   └── src/
│       ├── app/            App Router pages
│       ├── components/     React components
│       ├── lib/            API client, utils
│       └── hooks/
├── docker/                 Dockerfiles
├── docker-compose.yml      Local dev orchestration
└── .github/workflows/      CI/CD
```

## Quick Start (Local Dev)

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit both files — at minimum set OPENAI_API_KEY and JWT_SECRET_KEY

# 2. Start everything
docker-compose up -d

# 3. Run database migrations
docker-compose exec backend alembic upgrade head

# 4. Seed demo users (optional)
docker-compose exec backend python -m app.scripts.seed

# 5. Visit
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000/docs   (OpenAPI Swagger UI)
```

## Demo Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Judge | judge@nyayaai.in | Demo@1234 |
| Lawyer | lawyer@nyayaai.in | Demo@1234 |
| Litigant | litigant@nyayaai.in | Demo@1234 |
| Clerk | clerk@nyayaai.in | Demo@1234 |
| Prosecutor | prosecutor@nyayaai.in | Demo@1234 |
| Admin | admin@nyayaai.in | Demo@1234 |

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel + Railway/AWS setup.

## License

Proprietary — BMSCE academic project. Contact author before redistribution.
