import uuid
from typing import Generator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agent.react_agent import ReActAgent
from app.config import settings
from app.core.llm_provider import LLMProvider
from app.core.openai_provider import OpenAIProvider
from app.core.ollama_provider import OllamaProvider
from app.models.schemas import ChatRequest, ChatResponse, SessionInfo
from app.telemetry.metrics import tracker
from app.tools import get_leave_request_tools, get_user_management_tools

router = APIRouter()

sessions: dict[str, list[dict]] = {}
session_state: dict[str, dict] = {}


def _get_provider(provider_name: str | None = None, model: str | None = None) -> LLMProvider:
    name = provider_name or settings.DEFAULT_PROVIDER
    if name == "openai":
        return OpenAIProvider(
            model_name=model or settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
    elif name == "ollama":
        return OllamaProvider(
            model_name=model or settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
        )
    raise HTTPException(status_code=400, detail=f"Unknown provider: {name}")


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    provider = _get_provider(request.provider, request.model)

    if session_id not in sessions:
        sessions[session_id] = []
    if session_id not in session_state:
        session_state[session_id] = {}

    agent = ReActAgent(
        llm=provider,
        tools=[*get_leave_request_tools(), *get_user_management_tools()],
        max_steps=settings.MAX_AGENT_STEPS,
    )
    result = agent.run(
        request.message,
        session_state=session_state[session_id],
        employee_id=request.employee_id,
        role=request.role,
        history=sessions[session_id],
    )

    sessions[session_id].append({
        "user": request.message,
        "assistant": result["content"],
    })

    tracker.track_request(
        provider=result["provider"],
        model=provider.model_name,
        usage=result["usage"],
        latency_ms=result["latency_ms"],
    )

    return ChatResponse(
        response=result["content"],
        session_id=session_id,
        provider=result["provider"],
        model=provider.model_name,
        usage=result["usage"],
        latency_ms=result["latency_ms"],
        requires_confirmation=result["requires_confirmation"],
        trace=result["trace"],
    )


@router.post("/chat/stream")
def chat_stream(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    provider = _get_provider(request.provider, request.model)

    if session_id not in sessions:
        sessions[session_id] = []

    history_context = "\n".join(
        [f"User: {m['user']}\nAssistant: {m['assistant']}" for m in sessions[session_id]]
    )
    prompt = request.message
    if history_context:
        prompt = f"Previous conversation:\n{history_context}\n\nUser: {request.message}"

    def generate() -> Generator[str, None, None]:
        full_response = ""
        for chunk in provider.stream(prompt):
            full_response += chunk
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

        sessions[session_id].append({
            "user": request.message,
            "assistant": full_response,
        })

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/chat/{session_id}/history")
def get_history(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "messages": sessions[session_id]}


@router.get("/sessions")
def list_sessions():
    return [
        SessionInfo(
            session_id=sid,
            message_count=len(msgs),
            created_at="",
        )
        for sid, msgs in sessions.items()
    ]
