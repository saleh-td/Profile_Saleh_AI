from fastapi import APIRouter

from app.api.routes import chat, health

api_router = APIRouter()

# Endpoints explicitly requested in the spec.
api_router.include_router(health.router)
api_router.include_router(chat.router)
