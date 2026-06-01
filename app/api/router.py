from fastapi import APIRouter

from app.api.endpoints import chat, health, crud, dashboard

api_router = APIRouter()
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(health.router, tags=["health"])
api_router.include_router(crud.router, tags=["crud"])
api_router.include_router(dashboard.router, tags=["dashboard"])
