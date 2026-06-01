# Group Report: Lab 3 - Production-Grade Agentic System

- **Team Name**: HR Agent Team
- **Team Members**: Nguyễn Viết Linh (2A202600719), Mai Ngọc Duy, kamusarj
- **Deployment Date**: 2026-06-01

---

## 1. Executive Summary

Hệ thống HR Agent được xây dựng dựa trên kiến trúc **ReAct (Reasoning + Acting)**, cho phép AI suy luận nhiều bước, gọi tool để lấy dữ liệu thực, và trả lời chính xác thay vì bịa thông tin.

- **Success Rate**: 85% trên 23 test cases (xem [`TEST_CASES.md`](../TEST_CASES.md))
- **Key Outcome**: Agent giải quyết được 100% tác vụ nhiều bước (check balance → create request) so với chatbot baseline chỉ trả lời được câu hỏi đơn giản. Hệ thống có 20 tools, hỗ trợ 3 LLM providers (DeepSeek, OpenAI, Ollama), và có confirmation flow để bảo vệ dữ liệu.

---

## 2. System Architecture & Tooling

### 2.1 ReAct Loop Implementation

```
User Input
    ↓
┌─────────────────────────────────────┐
│  ReAct Loop (max 8 steps)           │
│                                     │
│  1. LLM generate → parse Thought    │
│  2. Nếu có Action → gọi tool        │
│  3. Observation → thêm vào scratchpad│
│  4. Lặp lại cho đến Final Answer    │
└─────────────────────────────────────┘
    ↓
Response + Trace
```

**Confirmation Flow (Write tools):**
1. Agent gọi tool với `confirmed: false` → Tool trả `requires_confirmation: true`
2. Agent hỏi xác nhận user
3. User trả lời "có" → Agent gọi tool với `confirmed: true`
4. Tool thực hiện → Trả kết quả

**Key files:**
- `app/agent/react_agent.py` - ReAct loop, tool runner, confirmation flow
- `app/api/endpoints/chat.py` - Streaming SSE endpoint với threading + queue

### 2.2 Tool Definitions (Inventory)

| # | Tool | Type | Mô tả |
|---|------|------|-------|
| 1 | `Search_HR_Policy` | Read/RAG | Tra cứu chính sách nhân sự |
| 2 | `Check_Leave_Balance` | Read | Xem số ngày phép còn lại |
| 3 | `Calculate_Leave_Days` | Read | Tính số ngày nghỉ (working/weekend) |
| 4 | `Create_Leave_Request` | Write | Tạo đơn nghỉ phép |
| 5 | `Get_Leave_Request` | Read | Xem chi tiết đơn |
| 6 | `List_Leave_Requests` | Read | Liệt kê đơn nghỉ |
| 7 | `Update_Leave_Request` | Write | Sửa đơn nghỉ |
| 8 | `Cancel_Leave_Request` | Write | Hủy đơn nghỉ |
| 9 | `Create_Employee` | Write/HR | Tạo nhân viên (hr_admin only) |
| 10 | `Get_Employee` | Read | Xem hồ sơ nhân viên |
| 11 | `Search_Employees` | Read | Tìm kiếm nhân viên (manager/hr) |
| 12 | `Update_Employee` | Write/HR | Sửa hồ sơ (hr_admin only) |
| 13 | `Deactivate_Employee` | Write/HR | Khóa tài khoản (hr_admin only) |
| 14 | `Activate_Employee` | Write/HR | Mở khóa (hr_admin only) |
| 15 | `Update_Leave_Balance` | Write/HR | Cập nhật phép (hr_admin only) |
| 16 | `Create_Task` | Write | Tạo công việc |
| 17 | `Get_Task` | Read | Xem chi tiết task |
| 18 | `List_Tasks` | Read | Liệt kê task |
| 19 | `Update_Task` | Write | Sửa task |
| 20 | `Delete_Task` | Write | Xóa task |
| 21 | `Search_Tasks` | Read | Tìm kiếm task |

### 2.3 LLM Providers Used

| Provider | Model | Status |
|----------|-------|--------|
| **DeepSeek** (default) | deepseek-v4-flash | ✅ Primary |
| **OpenAI** | gpt-4o | ✅ Supported |
| **Ollama** | qwen3.5:2b | ✅ Local fallback |

---

## 3. Telemetry & Performance Dashboard

Structured JSON logs được ghi vào `logs/` với các event:

| Event | Thông tin |
|-------|-----------|
| `AGENT_START` | Input, model name |
| `AGENT_LLM` | Step number, LLM output |
| `AGENT_TOOL` | Tool name, args, observation, latency |
| `AGENT_WAITING_CONFIRMATION` | Pending action details |
| `AGENT_END` | Final answer, confirmation status |
| `TOOL_CALL` | Trace ID, tool name, latency |
| `TOOL_CALL_ERROR` | Error code, arguments |

**Metrics tracked:**
- Latency per request (ms)
- Token usage (prompt/completion)
- Tool call success/failure rate
- Confirmation flow completion rate

---

## 4. Root Cause Analysis (RCA) - Failure Traces

### Case Study 1: Confirmation Flow Bug

- **Problem**: Agent gọi tool với `confirmed: false` nhưng khi user xác nhận, tool vẫn bị `CONFIRMATION_REQUIRED`
- **Log**: `app/agent/react_agent.py:168` - `_execute_pending_action` không set `confirmed: true`
- **Root Cause**: Method `_execute_pending_action` pop pending action nhưng giữ nguyên args có `confirmed: false`
- **Solution**: Thêm `pending["args"]["confirmed"] = True` trước khi invoke tool
- **File**: `app/agent/react_agent.py:181`

### Case Study 2: Dashboard không hiển thị data

- **Problem**: Agent tạo task/leave thành công nhưng dashboard trống
- **Root Cause**: Hệ thống có 2 nguồn data riêng biệt:
  - Agent tools ghi vào JSON files (`app/data/tasks.jsonl`)
  - CRUD API đọc từ PostgreSQL database
- **Solution**: Sửa CRUD endpoints đọc từ JSON files thay vì PostgreSQL
- **File**: `app/api/endpoints/crud.py`

### Case Study 3: Task drag-drop crash

- **Problem**: Kéo task sang cột khác → `Failed to fetch`
- **Root Cause**: `TaskResponse.tags` expects `string` nhưng agent tools lưu `list`
- **Solution**: Thêm `isinstance(tags, list)` check và convert sang JSON string
- **File**: `app/api/endpoints/crud.py:260, 330`

### Case Study 4: SSE Streaming không real-time

- **Problem**: Tất cả trace events hiện cùng lúc, không stream từng phần
- **Root Cause**: `agent.run()` chạy synchronous → hoàn thành toàn bộ rồi mới yield
- **Solution**: Thêm `on_event` callback vào agent, dùng `threading.Thread` + `queue.Queue`
- **File**: `app/api/endpoints/chat.py`, `app/agent/react_agent.py`

---

## 5. Ablation Studies & Experiments

### Experiment 1: Chatbot vs Agent

| Case | Chatbot Result | Agent Result | Winner |
|------|---------------|--------------|--------|
| "Xin chào" | Correct | Correct | Draw |
| "Kiểm tra phép" | Hallucinate số ngày | Correct (gọi tool) | **Agent** |
| "Tạo đơn nghỉ phép" | Không hiểu yêu cầu | Tạo đơn + xác nhận | **Agent** |
| "Nghỉ ốm 2 ngày, cần giấy gì?" | Bịa quy định | Tìm policy + check balance | **Agent** |
| "Khóa tài khoản E002" | Không phân quyền | Check role → FORBIDDEN | **Agent** |

### Experiment 2: Confirmation Flow

| Approach | Kết quả |
|----------|---------|
| Không có confirmation | Tool gọi ngay, user không kiểm soát được |
| Có confirmation (2 bước) | User kiểm soát được mọi write operation |

---

## 6. Production Readiness Review

### Security
- **Role-based access control**: HR admin tools bị block cho employee/manager
- **Confirmation flow**: Mọi write operation cần user xác nhận
- **Input validation**: Pydantic models validate tất cả input

### Guardrails
- **Max steps**: `MAX_AGENT_STEPS = 8`防止 infinite loop
- **Confirmation words**: Whitelist "có", "xác nhận", "ok", "đồng ý"
- **Write tool detection**: `WRITE_TOOLS` set để xác định tool nào cần confirmation

### Scaling
- **Async tool calls**: Hiện tại synchronous, có thể chuyển sang `asyncio`
- **Vector DB**: Thay keyword search bằng vector search cho HR policy
- **Multi-agent**: Tách thành specialized agents (leave, task, employee)
- **Database**: Chuyển từ JSON files sang PostgreSQL cho production

---

> Submit this report by renaming it to `GROUP_REPORT_[TEAM_NAME].md` and placing it in this folder.
