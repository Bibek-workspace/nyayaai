# NyayaAI Architecture

## Layered design

```
┌──────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION   Next.js 14 (App Router) + React + Tailwind │
│                   - Auth pages, dashboard, cases, AI search  │
│                   - React Query for server state             │
│                   - Zustand for auth                         │
└──────────────────────────────────────────────────────────────┘
                              │ HTTPS / JSON
┌──────────────────────────────────────────────────────────────┐
│ 2. API GATEWAY    FastAPI                                    │
│                   - JWT bearer auth (access + refresh)       │
│                   - RBAC via Depends(require_roles(...))     │
│                   - Pydantic validation                      │
│                   - CORS + GZip middleware                   │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 3. SERVICES       Business logic & integrations              │
│                   - services/ai.py            (RAG, summaries) │
│                   - services/text_extraction  (OCR, PDF, DOCX) │
│                   - services/storage          (S3 / R2 / MinIO) │
│                   - services/notifications    (email, SMS)    │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 4. DATA           SQLAlchemy 2.0 async + Alembic             │
│                   PostgreSQL 16 + pgvector                   │
│                   Redis (cache + background tasks)           │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 5. INFRASTRUCTURE Docker · S3 · OpenAI · SMTP · Twilio       │
└──────────────────────────────────────────────────────────────┘
```

## Case state machine

```
                 ┌──────┐
                 │FILED │
                 └───┬──┘
                     ▼
              ┌──────────┐
              │REGISTERED│
              └────┬─────┘
                   ▼
           ┌──────────────┐
           │NOTICE_ISSUED │
           └──────┬───────┘
                  ▼
            ┌──────────┐
            │PLEADINGS │
            └────┬─────┘
                 ▼
            ┌────────┐
            │EVIDENCE│
            └────┬───┘
                 ▼
           ┌──────────┐
           │ARGUMENTS │
           └────┬─────┘
                ▼
       ┌──────────────────┐
       │JUDGMENT_RESERVED │
       └────────┬─────────┘
                ▼
            ┌────────┐
            │DISPOSED│
            └────┬───┘
                 ▼
            ┌────────┐
            │APPEALED│  (terminal)
            └────────┘
```

State transitions are enforced by the `CASE_TRANSITIONS` table in
`app/models/enums.py`. Invalid transitions return HTTP 400.

## Document upload pipeline

```
Client uploads file
        │
        ▼
 [POST /documents]
        │
        │  • MIME + size validation
        │  • SHA256 dedupe per uploader
        ▼
   S3 upload (storage_key)
        │
        ▼
   Synchronous text extract
        │
        │  PDF: pypdf → if <200 chars: pdf2image+Tesseract
        │  DOCX: python-docx
        │  Image: Tesseract
        ▼
   Document row persisted, 201 returned
        │
        ▼  (FastAPI BackgroundTasks)
   Chunk text (LangChain RecursiveCharacterTextSplitter, 800/100)
        │
        ▼
   Batch-embed via OpenAI text-embedding-3-large (3072 dims)
        │
        ▼
   Persist DocumentChunk rows with pgvector embeddings
        │
        ▼
   GPT-4o-mini structured legal summary → Document.ai_summary
```

## RAG precedent search

```
User query
   │
   ▼
[POST /ai/precedent-search]
   │
   ▼
  Embed query (text-embedding-3-large)
   │
   ▼
  pgvector cosine search over document_chunks
   │   ORDER BY embedding <=> :query_vec LIMIT k
   ▼
  Top-k chunks (with similarity scores)
   │
   ▼
  Build grounded prompt:
   "Answer the query using ONLY these sources.
    Cite [Source N]. If not in sources, say so."
   │
   ▼
  GPT-4o-mini → answer with inline citations
   │
   ▼
  Return { answer, hits[], elapsed_ms }
```

## RBAC matrix

| Action                       | Judge | Lawyer | Litigant | Clerk | Prosecutor | Admin |
|------------------------------|:-----:|:------:|:--------:|:-----:|:----------:|:-----:|
| View own cases               |   ✓   |   ✓    |    ✓     |  ✓    |     ✓      |   ✓   |
| Create case                  |   ✓   |   ✓    |    ✓     |  ✓    |     ✓      |   ✓   |
| Update case metadata         |   ✓   |        |          |  ✓    |            |   ✓   |
| Advance case status          |   ✓   |        |          |  ✓    |            |   ✓   |
| Schedule hearing             |   ✓   |        |          |  ✓    |            |   ✓   |
| Upload documents             |   ✓   |   ✓    |    ✓     |  ✓    |     ✓      |   ✓   |
| AI precedent search          |   ✓   |   ✓    |    ✓     |  ✓    |     ✓      |   ✓   |
| View all cases (system-wide) |       |        |          |  ✓    |            |   ✓   |
| Manage users                 |       |        |          |       |            |   ✓   |
| System analytics             |       |        |          |       |            |   ✓   |

Enforced both at the API layer (`require_roles` dependency) and via row-level
filtering inside list endpoints (the `_scope_cases` helper).

## Security model

- **JWT**: short-lived access token (30 min) + longer refresh token (7 days).
  Refresh uses a single-flight pattern in the axios client to prevent thundering herds.
- **Passwords**: bcrypt via passlib; never logged or returned.
- **Transport**: TLS everywhere in production; HSTS via reverse proxy.
- **CORS**: strict allowlist of frontend origins.
- **S3**: server-side AES-256 encryption; presigned URLs for downloads (10-min TTL).
- **DB**: Postgres SSL in production; connection pooling with `pool_pre_ping`.
- **Input validation**: Pydantic models reject malformed payloads with 422.
- **File uploads**: MIME-prefix allowlist, 25 MB cap, SHA256 dedupe.
- **RBAC**: dependency-injected gates per route + row-scoping in list queries.
