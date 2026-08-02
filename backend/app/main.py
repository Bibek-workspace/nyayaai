import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1 import api_router
from app.core.config import settings
from app.db.session import engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting %s in %s mode",
        settings.APP_NAME,
        settings.ENVIRONMENT,
    )

    # Enable pgvector only for PostgreSQL
    if "postgresql" in settings.DATABASE_URL:
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text("CREATE EXTENSION IF NOT EXISTS vector")
                )
            logger.info("pgvector extension confirmed")
        except Exception as e:
            logger.warning(
                "Could not enable pgvector at startup: %s",
                e,
            )

    yield

    await engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI-Powered Legal Case Management System for the Indian Judiciary",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    GZipMiddleware,
    minimum_size=1024,
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation failed",
            "errors": exc.errors(),
        },
    )


@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "env": settings.ENVIRONMENT,
    }


app.include_router(
    api_router,
    prefix=settings.API_V1_PREFIX,
)
