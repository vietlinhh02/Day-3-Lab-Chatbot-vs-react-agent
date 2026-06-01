# Individual Report: Lab 3 - Chatbot vs ReAct Agent

- **Student Name**: [Your Name Here]
- **Student ID**: [Your ID Here]
- **Date**: 2026-06-01

---

## I. Technical Contribution (15 Points)

### Commits

| Commit | Mô tả |
|--------|-------|
| `Add some leave and quit tools` | Implement leave request tools và tests |

### Modules Implemented

| Module | File | Mô tả |
|--------|------|-------|
| Leave Request Tools | `app/tools/tools.py` | 7 leave tools: Check_Leave_Balance, Calculate_Leave_Days, Create_Leave_Request, Get_Leave_Request, List_Leave_Requests, Update_Leave_Request, Cancel_Leave_Request |
| Leave Tools Tests | `tests/test_leave_request_tools.py` | Unit tests cho leave tools |
| Tools Init | `app/tools/__init__.py` | Export leave tools |

### Code Highlights

**Leave Tools (`tools.py`)**
- `check_leave_balance()`: Đọc số ngày phép từ employees.json
- `calculate_leave_days()`: Tính working days, weekend days
- `create_leave_request()`: Tạo đơn nghỉ, validate date range, check balance
- `update_leave_request()`: Sửa đơn, check status transition
- `cancel_leave_request()`: Hủy đơn, chỉ hủy được draft/submitted

**Validation logic:**
```python
def _ensure_balance(employee, leave_type, working_days):
    if leave_type == "annual_leave" and working_days > employee.get("annual_leave_remaining", 0):
        raise ToolError("INSUFFICIENT_LEAVE_BALANCE", "...")

def _ensure_confirmed(confirmed):
    if not confirmed:
        raise ToolError("CONFIRMATION_REQUIRED", "...")
```

---

## II. Debugging Case Study (10 Points)

### Bug: Leave tools không validate date range

**Problem**: User tạo đơn nghỉ với `end_date` trước `start_date` → tool không báo lỗi

**Root Cause**: Không có validation cho date range trong `create_leave_request()`

**Solution**: Thêm Pydantic validator:
```python
class CalculateLeaveDaysInput(BaseModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_range(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date")
        return self
```

---

## III. Personal Insights: Chatbot vs ReAct (10 Points)

### 1. Reasoning
Leave tools minh họa rõ sự khác biệt: Chatbot bịa số ngày phép, Agent gọi `Check_Leave_Balance` để lấy data thực.

### 2. Reliability
Agent phức tạp hơn khi cần check balance trước khi tạo đơn, nhưng chính xác hơn Chatbot.

### 3. Observation
Observation từ leave tools giúp agent biết được "phép không đủ" hay "đơn đã duyệt" để trả lời user đúng.

---

## IV. Future Improvements (5 Points)

- **Approval workflow**: Tích hợp manager approval cho leave requests
- **Email notification**: Gửi email khi đơn được tạo/approved/rejected
- **Calendar integration**: Sync với Google Calendar

---

> Submit this report by renaming it to `REPORT_[YOUR_NAME].md` and placing it in this folder.
