# Lab 3: Chatbot vs ReAct Agent

Hệ thống **HR Agent** hỗ trợ nhân viên tra cứu chính sách, quản lý đơn nghỉ phép, quản lý công việc và hồ sơ nhân viên thông qua chat AI với ReAct loop.

## Cấu trúc thư mục

```
.
├── app/                          # Backend (FastAPI)
│   ├── main.py                   # Entry point
│   ├── config.py                 # Settings (đọc .env)
│   ├── database.py               # SQLAlchemy setup
│   ├── api/
│   │   ├── router.py             # Gộp tất cả routers
│   │   └── endpoints/
│   │       ├── chat.py           # POST /chat, POST /chat/stream (SSE)
│   │       ├── crud.py           # REST API cho employees, leave, tasks
│   │       ├── dashboard.py      # Dashboard stats
│   │       └── health.py         # GET /health
│   ├── agent/
│   │   └── react_agent.py        # ReAct loop: Thought → Action → Observation
│   ├── core/
│   │   ├── llm_provider.py       # Abstract base class
│   │   ├── openai_provider.py    # OpenAI implementation
│   │   ├── ollama_provider.py    # Ollama HTTP API
│   │   └── deepseek_provider.py  # DeepSeek API
│   ├── models/
│   │   ├── schemas.py            # Pydantic request/response
│   │   └── db_models.py          # SQLAlchemy ORM models
│   ├── tools/
│   │   ├── tools.py              # Leave request tools
│   │   ├── hr_tools.py           # HR policy search tools
│   │   ├── user_management_tools.py  # Employee CRUD tools
│   │   └── task_tools.py         # Task CRUD tools
│   ├── data/
│   │   ├── hr_policy.json        # Dữ liệu chính sách HR (RAG)
│   │   ├── leave_requests.jsonl  # Đơn nghỉ phép (JSONL)
│   │   └── tasks.jsonl           # Công việc (JSONL)
│   └── telemetry/
│       ├── logger.py             # Structured JSON logger
│       └── metrics.py            # Performance tracker
├── frontend/                     # Frontend (Next.js)
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── chat/             # Trang chat AI
│   │   │   ├── tasks/            # Trang quản lý công việc (Kanban)
│   │   │   ├── leave/            # Trang đơn nghỉ phép
│   │   │   └── employees/        # Trang nhân viên
│   │   └── login/                # Trang đăng nhập
│   ├── lib/
│   │   └── api.ts                # API client gọi backend
│   └── data/
│       └── employees.json        # Dữ liệu nhân viên
├── .env.example                  # Template biến môi trường
├── run.py                        # Script chạy backend
├── requirements.txt              # Python dependencies
└── TEST_CASES.md                 # Bộ test cases đầy đủ
```

## Yêu cầu hệ thống

| Tool | Version | Kiểm tra |
|------|---------|----------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| pnpm | 8+ | `pnpm --version` |
| uv | latest | `uv --version` |

---

## Hướng dẫn cài đặt & chạy

### Bước 1: Clone repo

```bash
git clone <repo-url>
cd Day-3-Lab-Chatbot-vs-react-agent
```

### Bước 2: Cấu hình biến môi trường

```bash
cp .env.example .env
```

Chỉnh sửa `.env`:

```env
# DeepSeek API (mặc định)
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://opencode.ai/zen/go/v1

# Ollama (nếu dùng local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:2b

# Provider: deepseek, openai, ollama
DEFAULT_PROVIDER=deepseek
```

### Bước 3: Cài Backend

```bash
# Tạo virtual environment
uv venv

# Cài dependencies
uv pip install -r requirements.txt
```

### Bước 4: Cài Frontend

```bash
cd frontend
pnpm install
cd ..
```

### Bước 5: Chạy Backend (Terminal 1)

```bash
uv run python run.py
```

Backend chạy tại `http://localhost:8000`

Swagger UI: `http://localhost:8000/docs`

### Bước 6: Chạy Frontend (Terminal 2)

```bash
cd frontend
pnpm dev
```

Frontend chạy tại `http://localhost:3000`

### Bước 7: Mở trình duyệt

Truy cập `http://localhost:3000` → Đăng nhập với tài khoản mẫu:

| Email | Password | Role |
|-------|----------|------|
| an@example.com | password123 | employee |
| manager@example.com | password123 | manager |
| hr@example.com | password123 | hr_admin |

---

## API Endpoints

### Chat

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/chat` | Gửi message, nhận response |
| `POST` | `/chat/stream` | SSE streaming response (real-time) |
| `GET` | `/chat/{session_id}/history` | Lịch sử chat của session |
| `GET` | `/sessions` | Danh sách tất cả sessions |

### CRUD

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/employees` | Danh sách nhân viên |
| `GET` | `/employees/{id}` | Chi tiết nhân viên |
| `GET` | `/leave-requests` | Danh sách đơn nghỉ |
| `POST` | `/leave-requests` | Tạo đơn nghỉ |
| `PATCH` | `/leave-requests/{id}` | Cập nhật đơn nghỉ |
| `GET` | `/tasks` | Danh sách công việc |
| `POST` | `/tasks` | Tạo công việc |
| `PATCH` | `/tasks/{id}` | Cập nhật công việc |
| `DELETE` | `/tasks/{id}` | Xóa công việc |

### Health

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/health` | Kiểm tra trạng thái providers |

---

## Ví dụ gọi API

### Chat thường

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Kiểm tra số ngày phép còn lại", "employee_id": "E001", "role": "employee"}'
```

### Chat streaming (real-time)

```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Tạo đơn nghỉ phép annual_leave từ 2026-06-10 đến 2026-06-12, lý do: việc gia đình"}'
```

### Tạo task qua API

```bash
curl -X POST "http://localhost:8000/tasks?creator_id=E001" \
  -H "Content-Type: application/json" \
  -d '{"title": "Review code", "assignee_id": "E002", "due_date": "2026-06-15"}'
```

---

## Tools (20 tools)

### Read-only (không cần xác nhận)

| Tool | Mô tả |
|------|-------|
| `Search_HR_Policy` | Tra cứu chính sách nhân sự |
| `Check_Leave_Balance` | Xem số ngày phép còn lại |
| `Calculate_Leave_Days` | Tính số ngày nghỉ |
| `Get_Leave_Request` | Xem chi tiết đơn nghỉ |
| `List_Leave_Requests` | Liệt kê đơn nghỉ |
| `Get_Employee` | Xem hồ sơ nhân viên |
| `Search_Employees` | Tìm kiếm nhân viên (manager/hr) |
| `Get_Task` | Xem chi tiết task |
| `List_Tasks` | Liệt kê task |
| `Search_Tasks` | Tìm kiếm task |

### Write tools (cần xác nhận)

| Tool | Mô tả |
|------|-------|
| `Create_Leave_Request` | Tạo đơn nghỉ |
| `Update_Leave_Request` | Sửa đơn nghỉ |
| `Cancel_Leave_Request` | Hủy đơn nghỉ |
| `Create_Task` | Tạo task |
| `Update_Task` | Sửa task |
| `Delete_Task` | Xóa task |

### HR Admin only (cần role hr_admin + xác nhận)

| Tool | Mô tả |
|------|-------|
| `Create_Employee` | Tạo nhân viên |
| `Update_Employee` | Sửa hồ sơ nhân viên |
| `Deactivate_Employee` | Khóa tài khoản |
| `Activate_Employee` | Mở khóa tài khoản |
| `Update_Leave_Balance` | Cập nhật số phép |

---

## ReAct Agent Flow

```
User: "Kiểm tra phép của tôi"
  ↓
Thought: Cần dùng Check_Leave_Balance
  ↓
Action: Check_Leave_Balance
  ↓
Action Input: {"employee_id": "E001"}
  ↓
Observation: {annual_leave: 4, sick_leave: 5}
  ↓
Final Answer: Bạn còn 4 ngày phép năm, 5 ngày phép ốm
```

### Confirmation Flow (Write tools)

```
User: "Tạo đơn nghỉ phép..."
  ↓
Agent gọi Create_Leave_Request (confirmed=false)
  ↓
Tool trả: requires_confirmation=true
  ↓
Agent hỏi: "Bạn có xác nhận không?"
  ↓
User: "có"
  ↓
Agent gọi Create_Leave_Request (confirmed=true)
  ↓
Tool thực hiện → Trả kết quả
```

---

## Ollama (LLM local)

```bash
# Cài Ollama: https://ollama.com/download
ollama pull qwen3.5:2b
ollama serve
```

Set trong `.env`:

```env
DEFAULT_PROVIDER=ollama
OLLAMA_MODEL=qwen3.5:2b
```

---

## Tests

```bash
# Backend tests
uv run pytest tests/ -v

# Lint
uv run ruff check app/ tests/

# Frontend type check
cd frontend && npx tsc --noEmit
```

Xem thêm bộ test cases đầy đủ tại [`TEST_CASES.md`](TEST_CASES.md).

---

## Logs

Structured JSON logs được lưu trong `logs/`:

```bash
# Xem logs real-time
tail -f logs/*.jsonl | jq .
```

---

## Mục tiêu lab

1. **Baseline Chatbot**: quan sát giới hạn của chatbot khi gặp tác vụ nhiều bước.
2. **ReAct Loop**: implement chu trình `Thought -> Action -> Observation`.
3. **Provider Switching**: chuyển giữa OpenAI, Ollama và DeepSeek.
4. **Tool Calling**: 20 tools cho HR, leave, task, employee management.
5. **Failure Analysis**: dùng structured logs trong `logs/` để tìm lỗi.
