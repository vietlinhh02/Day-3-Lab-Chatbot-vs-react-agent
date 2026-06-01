# Lab 3: Chatbot vs ReAct Agent

Đây là lab về quá trình chuyển từ chatbot LLM đơn giản sang **ReAct Agent** có
khả năng suy luận nhiều bước, gọi công cụ và ghi log để phân tích lỗi.

## Tài liệu đề tài HR Agent

Repo đã có bộ tài liệu cho đề tài **Proactive HR & Workflow Agent** trong
[`docs/`](docs/).

Hướng triển khai đề xuất:

- **FastAPI** cho backend API.
- **Ollama** để chạy LLM local.
- **RAG** trên PDF sổ tay nhân sự.
- **Tool calling** cho tra cứu chính sách, kiểm tra ngày phép và workflow xin nghỉ.
- **User management** để HR tạo, tìm kiếm, cập nhật và khóa/mở khóa nhân viên.
- **CRUD tool calling** để agent tạo, đọc, cập nhật và hủy yêu cầu xin nghỉ.

Bắt đầu từ: [`docs/README.md`](docs/README.md).

## Cấu trúc thư mục

```
app/
├── main.py                 # FastAPI app entry point
├── config.py               # Settings (pydantic-settings, đọc .env)
├── api/
│   ├── router.py           # Gộp tất cả routers
│   └── endpoints/
│       ├── chat.py         # POST /chat, POST /chat/stream (SSE), GET /chat/{id}/history
│       └── health.py       # GET /health
├── core/
│   ├── llm_provider.py     # Abstract base class
│   ├── openai_provider.py  # OpenAI implementation
│   └── ollama_provider.py  # Ollama HTTP API
├── agent/
│   └── react_agent.py      # ReAct agent logic
├── models/
│   └── schemas.py          # Pydantic request/response models
└── telemetry/
    ├── logger.py           # Structured JSON logger
    └── metrics.py          # Performance tracker
```

## Cài đặt môi trường

### 1. Copy `.env.example` sang `.env`

```bash
cp .env.example .env
```

Điền API key nếu dùng OpenAI, hoặc để trống nếu chỉ dùng Ollama.

### 2. Cài dependencies bằng uv

```bash
uv venv
uv pip install -r requirements.txt
```

Hoặc install cả dev dependencies (pytest, ruff):

```bash
uv pip install -e ".[dev]"
```

## Chạy server

```bash
uv run python run.py
```

Server sẽ chạy tại `http://localhost:8000`.

Swagger UI (API docs): `http://localhost:8000/docs`

## API Endpoints

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/chat` | Gửi message, nhận response |
| `POST` | `/chat/stream` | SSE streaming response |
| `GET` | `/chat/{session_id}/history` | Lịch sử chat của session |
| `GET` | `/sessions` | Danh sách tất cả sessions |
| `GET` | `/health` | Kiểm tra trạng thái providers |

### Ví dụ gọi API

```bash
# Chat (OpenAI)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "provider": "openai"}'

# Chat (Ollama)
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "provider": "ollama"}'

# SSE Streaming
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "provider": "openai"}'
```

## Chạy Ollama local

```bash
# Cài Ollama: https://ollama.com/download
ollama pull llama3
ollama serve
```

Sau đó set trong `.env`:

```env
DEFAULT_PROVIDER=ollama
OLLAMA_MODEL=llama3
```

## Tests

```bash
uv run pytest tests/ -v
```

## Lint

```bash
uv run ruff check app/ tests/
```

## Mục tiêu lab

1. **Baseline Chatbot**: quan sát giới hạn của chatbot khi gặp tác vụ nhiều bước.
2. **ReAct Loop**: implement chu trình `Thought -> Action -> Observation`.
3. **Provider Switching**: chuyển giữa OpenAI và Ollama.
4. **Failure Analysis**: dùng structured logs trong `logs/` để tìm lỗi.
5. **Grading & Bonus**: xem [SCORING.md](SCORING.md) để tối đa điểm.
