from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    provider: str | None = None
    model: str | None = None
    employee_id: str = "current_user"
    role: str = "employee"


class ChatResponse(BaseModel):
    response: str
    session_id: str
    provider: str
    model: str
    usage: dict[str, int] = Field(default_factory=dict)
    latency_ms: int = 0
    requires_confirmation: bool = False
    trace: list[dict[str, Any]] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    providers: dict[str, Any]


class SessionInfo(BaseModel):
    session_id: str
    message_count: int
    created_at: str
