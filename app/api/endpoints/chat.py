import uuid
import json
from typing import Generator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agent.react_agent import ReActAgent
from app.config import settings
from app.core.llm_provider import LLMProvider
from app.core.openai_provider import OpenAIProvider
from app.core.ollama_provider import OllamaProvider
from app.core.deepseek_provider import DeepSeekProvider
from app.models.schemas import ChatRequest, ChatResponse, SessionInfo
from app.telemetry.metrics import tracker
from app.tools import get_leave_request_tools, get_user_management_tools, get_task_tools
from app.tools.hr_tools import search_hr_policy, _tool

router = APIRouter()

sessions: dict[str, list[dict]] = {}
session_state: dict[str, dict] = {}

# Cache tools to avoid recreating them every request
_cached_tools = None


def _get_all_tools():
    global _cached_tools
    if _cached_tools is None:
        hr_policy_tool = _tool("Search_HR_Policy", "Tra cứu chính sách nhân sự từ sổ tay công ty.", search_hr_policy)
        _cached_tools = [hr_policy_tool] + get_leave_request_tools() + get_user_management_tools() + get_task_tools()
    return _cached_tools


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
    elif name == "deepseek":
        return DeepSeekProvider(
            model_name=model or settings.DEEPSEEK_MODEL,
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
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
        tools=_get_all_tools(),
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
    if session_id not in session_state:
        session_state[session_id] = {}

    agent = ReActAgent(
        llm=provider,
        tools=_get_all_tools(),
        max_steps=settings.MAX_AGENT_STEPS,
    )

    def generate() -> Generator[str, None, None]:
        # Run agent
        result = agent.run(
            request.message,
            session_state=session_state[session_id],
            employee_id=request.employee_id,
            role=request.role,
            history=sessions[session_id],
        )

        # Send trace events
        for step in result.get("trace", []):
            event_data = {
                "type": "trace",
                "tool": step.get("tool", ""),
                "args": step.get("args", {}),
            }
            yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"

        # Send response in chunks for streaming effect
        response_text = result["content"]
        chunk_size = 20
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i + chunk_size]
            event_data = {"type": "chunk", "content": chunk}
            yield f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"

        # Send done event
        done_data = {
            "type": "done",
            "session_id": session_id,
            "requires_confirmation": result["requires_confirmation"],
            "latency_ms": result["latency_ms"],
        }
        yield f"data: {json.dumps(done_data, ensure_ascii=False)}\n\n"

        # Save to session
        sessions[session_id].append({
            "user": request.message,
            "assistant": response_text,
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
