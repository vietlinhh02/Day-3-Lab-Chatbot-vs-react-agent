# Individual Report: Lab 3 - Chatbot vs ReAct Agent

- **Student Name**: Mai Ngọc Duy
- **Student ID**: 2A202600736
- **Date**: 2026-06-01

---

## I. Technical Contribution (15 Points)

### Commits

| Commit | Mô tả |
|--------|-------|
| `refactor: align tools with Duy branch` | Refactor tools, gộp leave tools và user management tools |
| `WIP: save current work` | Lưu work-in-progress |
| `push` | Push frontend skeleton, schemas, docker-compose |

### Modules Implemented

| Module | File | Mô tả |
|--------|------|-------|
| Tools Refactor | `app/tools/__init__.py` | Gộp leave tools + user management tools |
| Leave Tools | `app/tools/tools.py` | 7 leave request tools (refactor) |
| User Management Tools | `app/tools/user_management_tools.py` | 7 employee tools với RBAC |
| Frontend Skeleton | `frontend/` | Next.js app structure, login, components |
| Pydantic Schemas | `app/models/schemas.py` | ChatRequest, ChatResponse models |
| Docker Compose | `docker-compose.yml` | PostgreSQL + backend setup |

### Code Highlights

**1. Tools Alignment (`__init__.py`)**
```python
from app.tools.tools import get_leave_request_tools
from app.tools.user_management_tools import get_user_management_tools
from app.tools.task_tools import get_task_tools
```

**2. Pydantic Schemas (`schemas.py`)**
```python
class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    provider: str | None = None
    model: str | None = None
    employee_id: str = "current_user"
    role: str = "employee"
```

---

## II. Debugging Case Study (10 Points)

### Bug: Tools conflict giữa các branches

**Problem**: Duy branch có `tools.py` với leave tools, main branch có `hr_tools.py` với cùng functions → duplicate code, import conflict.

**Root Cause**: Hai người làm cùng feature trên 2 branches khác nhau, không sync.

**Solution**: Refactor gộp lại, xóa `hr_tools.py`, giữ `tools.py` làm single source of truth cho leave tools.

---

## III. Personal Insights: Chatbot vs ReAct (10 Points)

### 1. Reasoning
Refactor tools giúp hệ thống clean hơn - mỗi tool có một file riêng, dễ maintain.

### 2. Reliability
Teamwork quan trọng: cần align code giữa các branches để tránh conflict.

### 3. Observation
Pydantic schemas giúp validate input/output chính xác, giảm lỗi runtime.

---

## IV. Future Improvements (5 Points)

- **CI/CD**: Thêm GitHub Actions để auto-test trước khi merge
- **Code review**: Require PR review trước khi merge vào main
- **Branch strategy**: Sử dụng feature branches + develop branch

---

> Submit this report by renaming it to `REPORT_[YOUR_NAME].md` and placing it in this folder.