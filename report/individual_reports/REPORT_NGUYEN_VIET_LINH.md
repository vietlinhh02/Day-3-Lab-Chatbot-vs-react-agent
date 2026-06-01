# Individual Report: Lab 3 - Chatbot vs ReAct Agent

- **Student Name**: Nguyễn Viết Linh
- **Student ID**: 2A202600719
- **Date**: 2026-06-01

---

## I. Technical Contribution (15 Points)

### Commits (35 commits)

| Commit | Mô tả |
|--------|-------|
| `feat: add Crewwise design system with login and dashboard` | Khởi tạo frontend với Next.js, Tailwind, login page |
| `feat: add frontend (Next.js) and design doc` | Setup frontend architecture, DESIGN.md |
| `feat: restructure backend with FastAPI modular architecture` | Tách backend thành modules (api, core, agent, tools, models) |
| `feat: add DeepSeek V4 Flash provider` | Thêm DeepSeek provider cho LLM |
| `feat: add SSE streaming for chat and optimize agent` | Implement SSE streaming real-time |
| `feat: add task CRUD tools and update Ollama endpoint` | Task tools: Create, Get, List, Update, Delete, Search |
| `feat: add drag and drop to tasks page with @dnd-kit` | Kanban board với drag-and-drop |
| `feat: add employees, leave, chat, reports, settings pages` | Tất cả dashboard pages |
| `fix: drag and drop not working across columns` | Fix Kanban drag-drop bug |
| `fix: hydration error and add AI avatar in chat` | Fix React hydration error |
| `fix: increase MAX_AGENT_STEPS from 4 to 8` | Tăng max steps cho ReAct loop |
| `perf: handle simple greetings without agent loop` | Optimize: greeting không qua ReAct |
| ... | (23 commits khác) |

### Modules Implemented

| Module | File | Mô tả |
|--------|------|-------|
| ReAct Agent Core | `app/agent/react_agent.py` | ReAct loop, tool runner, confirmation flow, on_event callback |
| Chat Streaming | `app/api/endpoints/chat.py` | SSE streaming với threading + queue |
| CRUD Endpoints | `app/api/endpoints/crud.py` | REST API đọc/ghi từ JSON files |
| Task Tools | `app/tools/task_tools.py` | 6 task tools |
| User Mgmt Tools | `app/tools/user_management_tools.py` | 7 employee tools với RBAC |
| Frontend Chat | `frontend/app/dashboard/chat/page.tsx` | Chat UI với localStorage persistence |
| Frontend Tasks | `frontend/app/dashboard/tasks/page.tsx` | Kanban board với drag-drop |
| Frontend Dashboard | `frontend/app/dashboard/page.tsx` | Dashboard stats với Chart.js |
| DeepSeek Provider | `app/core/deepseek_provider.py` | DeepSeek API integration |

### Code Highlights

**1. Real-time Streaming (`chat.py`)**
```python
event_queue: queue.Queue = queue.Queue()

def on_event(event: dict) -> None:
    event_queue.put(event)

def run_agent() -> None:
    result = agent.run(..., on_event=on_event)
    event_queue.put({"type": "_result", "data": result})

thread = threading.Thread(target=run_agent, daemon=True)
thread.start()
```

**2. Confirmation Flow Fix (`react_agent.py:181`)**
```python
def _execute_pending_action(self, session_state, trace, on_event=None):
    pending = session_state.pop("pending_action")
    pending["args"]["confirmed"] = True  # Fix bug: set confirmed trước khi invoke
```

---

## II. Debugging Case Study (10 Points)

### Bug: Confirmation Flow không hoạt động

**Problem**: User xác nhận "có" nhưng tool vẫn bị `CONFIRMATION_REQUIRED`

**Log**: `react_agent.py:168` - `_execute_pending_action` giữ `confirmed: false`

**Root Cause**: `pending["args"]` giữ nguyên từ lần gọi đầu, không set `confirmed: true`

**Solution**: Thêm `pending["args"]["confirmed"] = True` trước khi invoke tool

---

## III. Personal Insights: Chatbot vs ReAct (10 Points)

### 1. Reasoning
Chatbot bịa dữ liệu ("Bạn còn 12 ngày phép"), Agent gọi tool để lấy data thực ("Bạn còn 4 ngày phép năm").

### 2. Reliability
Agent chậm hơn Chatbot cho simple greeting, nhưng chính xác hơn cho multi-step tasks.

### 3. Observation
Observation là "reality check" - buộc agent phải đối mặt với data thực, không hallucinate.

---

## IV. Future Improvements (5 Points)

- **Vector DB**: Thay keyword search bằng embedding search cho HR policy
- **Async tools**: Chạy parallel tools thay vì sequential
- **Multi-agent**: Tách thành specialized agents (Leave, Task, Employee)

---

> Submit this report by renaming it to `REPORT_[YOUR_NAME].md` and placing it in this folder.
