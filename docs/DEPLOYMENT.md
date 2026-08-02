# NyayaAI Deployment Guide

This guide covers two deployment paths: **Vercel + Railway** (fastest) and **AWS ECS + RDS** (most production-grade).

## Path 1 — Vercel (frontend) + Railway (backend + DB)

Recommended for MVP and demo. Total cost: $0–$20/month.

### A. Backend on Railway

1. Create a Railway project at <https://railway.app>.
2. Add three services:
   - **PostgreSQL** (Railway → New → Database → Postgres). Railway provides `DATABASE_URL`.
     - After deploy, connect with `psql` and run: `CREATE EXTENSION vector;`
   - **Redis** (New → Database → Redis).
   - **Backend service** — connect this GitHub repo, root directory `backend`.
3. In the backend service settings:
   - **Builder**: Dockerfile
   - **Dockerfile path**: `docker/backend.Dockerfile`
   - **Root directory**: `backend`
4. Set environment variables (Variables tab):
   ```
   ENVIRONMENT=production
   JWT_SECRET_KEY=<openssl rand -hex 32>
   DATABASE_URL=${{Postgres.DATABASE_URL}}   # Railway interpolation
   # Convert postgres:// → postgresql+asyncpg:// — Railway does NOT do this for you.
   # Use a separate var or a pre-start script.
   REDIS_URL=${{Redis.REDIS_URL}}
   OPENAI_API_KEY=sk-...
   S3_ACCESS_KEY=AKIA...        # AWS S3 or Cloudflare R2
   S3_SECRET_KEY=...
   S3_BUCKET=nyayaai-prod-documents
   S3_REGION=ap-south-1
   BACKEND_CORS_ORIGINS=["https://your-app.vercel.app"]
   ```
5. Add a **Pre-deploy command**: `alembic upgrade head`
6. Set the **start command** to: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers`
7. Deploy. Note the public URL — you'll need it for the frontend.

### B. Object storage — AWS S3 or Cloudflare R2

R2 is cheaper (zero egress fees) and S3-compatible.

```bash
# Cloudflare R2 example
# - Create a bucket "nyayaai-prod-documents"
# - Generate an API token with Object Read + Write permissions
# - Endpoint URL: https://<accountid>.r2.cloudflarestorage.com
```

In Railway, add:
```
S3_ENDPOINT_URL=https://<accountid>.r2.cloudflarestorage.com
```

### C. Frontend on Vercel

1. Push the repo to GitHub.
2. <https://vercel.com> → Import Project.
3. **Root directory**: `frontend`
4. Framework preset: Next.js (auto-detected).
5. Environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://<your-railway-backend-url>
   ```
6. Deploy.

### D. Custom domain (optional)

Vercel → Project → Settings → Domains. Point a CNAME to `cname.vercel-dns.com`.

For the backend domain, Railway → Service → Settings → Networking → Custom Domain.

---

## Path 2 — AWS production setup

For higher scale or compliance requirements.

| Layer | Service |
|-------|---------|
| Frontend | Vercel (or S3 + CloudFront if you must self-host) |
| Backend  | ECS Fargate behind ALB, OR App Runner |
| Database | RDS for PostgreSQL 16 with pgvector via parameter group (`shared_preload_libraries`) |
| Cache    | ElastiCache for Redis |
| Storage  | S3 |
| Email    | SES |
| Secrets  | AWS Secrets Manager (mount as env vars in the task definition) |
| Monitor  | CloudWatch + Sentry |

### High-level steps

1. **RDS Postgres 16** — enable pgvector:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
2. **ECR repository** for the backend image. Push:
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
   docker build -f docker/backend.Dockerfile -t nyayaai-backend ./backend
   docker tag nyayaai-backend <acct>.dkr.ecr.<region>.amazonaws.com/nyayaai-backend:latest
   docker push <acct>.dkr.ecr.<region>.amazonaws.com/nyayaai-backend:latest
   ```
3. **ECS Task Definition** with the env vars from `.env.example`. Mount secrets from Secrets Manager.
4. **ALB** in front of the ECS service, with TLS via ACM.
5. **Migrations as a one-off ECS task** before deploying new versions:
   ```bash
   aws ecs run-task --cluster nyayaai --task-definition nyayaai-migrate
   ```

---

## Production checklist before going live

- [ ] Rotate `JWT_SECRET_KEY` to a strong random value (`openssl rand -hex 32`).
- [ ] Set `ENVIRONMENT=production` — disables SQLAlchemy echo + verbose errors.
- [ ] Restrict `BACKEND_CORS_ORIGINS` to your real frontend domain(s) only.
- [ ] S3 bucket policy denies public reads; only the API issues presigned URLs.
- [ ] Postgres `max_connections` tuned for your pool size (10 × replicas).
- [ ] pgvector `IVFFlat` `lists` parameter re-tuned once corpus exceeds ~10k chunks
      (rule of thumb: `lists = sqrt(N)`).
- [ ] Configure Sentry DSN for both frontend + backend.
- [ ] Set up daily Postgres backups (Railway auto, RDS via snapshots).
- [ ] Add a WAF in front of the API (AWS WAF, Cloudflare).
- [ ] Set up rate limiting at the edge (Cloudflare rate-limit rules or
      `slowapi` middleware on FastAPI).
- [ ] Configure SES/SendGrid SPF, DKIM, DMARC records for email deliverability.

## Troubleshooting

**"vector type does not exist"** — pgvector extension isn't installed.
Run `CREATE EXTENSION vector;` in your database.

**Frontend can't reach backend** — verify `NEXT_PUBLIC_API_URL` and check
`BACKEND_CORS_ORIGINS` on the backend includes the exact frontend origin
(no trailing slash).

**Uploads fail with 415** — the file's MIME type isn't in `ALLOWED_MIME_PREFIXES`
in `backend/app/api/v1/documents.py`. Whitelist as needed.

**OCR returns empty text** — verify `tesseract-ocr` and `poppler-utils` are
installed in the backend container. For Hindi documents, ensure
`tesseract-ocr-hin` is present and `OCR_LANGUAGES=eng+hin`.
