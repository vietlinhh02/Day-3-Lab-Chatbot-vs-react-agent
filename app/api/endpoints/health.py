from fastapi import APIRouter

from app.config import settings
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health():
    providers = {
        "openai": {"configured": bool(settings.OPENAI_API_KEY)},
        "ollama": {"configured": True, "base_url": settings.OLLAMA_BASE_URL},
    }
    return HealthResponse(status="ok", providers=providers)
