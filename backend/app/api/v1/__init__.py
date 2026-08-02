"""Aggregates all v1 routers into a single APIRouter."""
from fastapi import APIRouter

from app.api.v1 import admin, ai, auth, cases, dashboard, documents, hearings, notifications

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(cases.router)
api_router.include_router(hearings.router)
api_router.include_router(documents.router)
api_router.include_router(ai.router)
api_router.include_router(notifications.router)
api_router.include_router(admin.router)
