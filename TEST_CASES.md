# HR Agent - Hướng dẫn Test Cases

## Cách chạy server

```bash
# Terminal 1: Start backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend
cd frontend && pnpm dev
```

---

## 1. Health Check

| # | Test | Endpoint | Expected |
|---|------|----------|----------|
| 1.1 | Kiểm tra server | `GET /health` | `status: "ok"`, providers configured |

```bash
curl http://localhost:8000/health
```

---

## 2. Chat - Greeting (Không gọi tool)

| # | Test | Input | Expected |
|---|------|-------|----------|
| 2.1 | Chào đơn giản | `"Xin chào"` | Response chào lại, `trace: []` |
| 2.2 | Chào tiếng Anh | `"Hello"` | Response chào lại |
| 2.3 | Chào slang | `"Alo"` | Response chào lại |

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Xin chào", "employee_id": "E001", "role": "employee"}'
```

---

## 3. Chat - Read-only Tools

### 3.1 Search HR Policy

| # | Input | Expected |
|---|-------|----------|
| 3.1.1 | `"Cho tôi xem chính sách nghỉ phép"` | Gọi `Search_HR_Policy`, trả về policy hoặc "không tìm thấy" |
| 3.1.2 | `"Chính sách về lương"` | Gọi `Search_HR_Policy` |

### 3.2 Check Leave Balance

| # | Input | Expected |
|---|-------|----------|
| 3.2.1 | `"Kiểm tra số ngày phép còn lại của tôi"` | Gọi `Check_Leave_Balance`, trả về annual/sick leave |
| 3.2.2 | `"E001 còn bao nhiêu ngày phép?"` | Gọi `Check_Leave_Balance` |

### 3.3 Calculate Leave Days

| # | Input | Expected |
|---|-------|----------|
| 3.3.1 | `"Tính số ngày nghỉ từ 2026-06-01 đến 2026-06-05"` | Gọi `Calculate_Leave_Days`, trả về working_days |
| 3.3.2 | `"Nghỉ 3 ngày từ thứ 2 đến thứ 4 được bao nhiêu ngày làm việc?"` | Gọi `Calculate_Leave_Days` |

### 3.4 List Leave Requests

| # | Input | Expected |
|---|-------|----------|
| 3.4.1 | `"Liệt kê đơn nghỉ phép của tôi"` | Gọi `List_Leave_Requests` |
| 3.4.2 | `"Xem các đơn chờ duyệt"` | Gọi `List_Leave_Requests` với status filter |

### 3.5 Get Employee

| # | Input | Expected |
|---|-------|----------|
| 3.5.1 | `"Cho tôi xem thông tin nhân viên E001"` | Gọi `Get_Employee`, trả về profile |
| 3.5.2 | `"Thông tin của tôi"` | Gọi `Get_Employee` |

### 3.6 List/Search Tasks

| # | Input | Expected |
|---|-------|----------|
| 3.6.1 | `"Liệt kê tất cả công việc"` | Gọi `List_Tasks` |
| 3.6.2 | `"Tìm task có từ khóa review"` | Gọi `Search_Tasks` |

---

## 4. Chat - Write Tools (Confirmation Flow)

### Flow xác nhận:
1. User gửi yêu cầu → Agent gọi tool với `confirmed: false`
2. Tool trả `requires_confirmation: true` → Agent hỏi xác nhận
3. User trả lời "có" → Agent gọi tool với `confirmed: true`
4. Tool thực hiện → Trả kết quả

### 4.1 Create Leave Request

| # | Step | Input | Expected |
|---|------|-------|----------|
| 4.1.1 | Tạo đơn | `"Tạo đơn nghỉ phép annual_leave từ 2026-06-10 đến 2026-06-12, lý do: việc gia đình"` | `pending_confirmation: true` |
| 4.1.2 | Xác nhận | `"có"` | `Đã tạo đơn LR-xxxx` |

### 4.2 Create Task

| # | Step | Input | Expected |
|---|------|-------|----------|
| 4.2.1 | Tạo task | `"Dùng tool Create_Task tạo task: actor_employee_id=E001, title=Review code, assignee_id=E002, due_date=2026-06-15"` | `pending_confirmation: true` |
| 4.2.2 | Xác nhận | `"có"` | `Đã tạo task T-xxx` |

### 4.3 Cancel Leave Request

| # | Step | Input | Expected |
|---|------|-------|----------|
| 4.3.1 | Hủy đơn | `"Hủy đơn LR-1024 vì lý do đổi kế hoạch"` | `pending_confirmation: true` |
| 4.3.2 | Xác nhận | `"có"` | `Đã hủy đơn LR-1024` |

### 4.4 Update Task

| # | Step | Input | Expected |
|---|------|-------|----------|
| 4.4.1 | Sửa task | `"Cập nhật task T-001: status=in_progress"` | `pending_confirmation: true` |
| 4.4.2 | Xác nhận | `"có"` | `Đã cập nhật task T-001` |

### 4.5 Delete Task

| # | Step | Input | Expected |
|---|------|-------|----------|
| 4.5.1 | Xóa task | `"Xóa task T-001 vì đã hoàn thành"` | `pending_confirmation: true` |
| 4.5.2 | Xác nhận | `"có"` | `Đã xóa task T-001` |

---

## 5. Chat - HR Admin Tools (Role-based)

### Điều kiện: `employee_id` phải là HR admin (HR001)

| # | Test | Input (với HR001) | Expected |
|---|------|-------------------|----------|
| 5.1 | Tạo nhân viên | `"Tạo nhân viên mới: Nguyễn Test, email test@vinuni.edu.vn, Engineering, Developer, manager M001, role employee, annual 12, sick 5"` | Confirmation → Tạo thành công |
| 5.2 | Khóa nhân viên | `"Khóa tài khoản E002 vì nghỉ việc"` | Confirmation → Khóa thành công |
| 5.3 | Mở khóa nhân viên | `"Mở khóa tài khoản E002"` | Confirmation → Mở khóa thành công |

### Role-based Access Control

| # | Test | Input (với E001 - employee) | Expected |
|---|------|----------------------------|----------|
| 5.4 | Employee tạo nhân viên | `"Tạo nhân viên mới..."` | `FORBIDDEN: Bạn cần quyền hr_admin` |
| 5.5 | Employee tìm NV | `"Tìm nhân viên Engineering"` | `FORBIDDEN: Only manager or hr_admin` |
| 5.6 | Employee khóa NV | `"Khóa tài khoản E002"` | Agent từ chối trước khi gọi tool |

---

## 6. Error Handling

| # | Test | Input | Expected |
|---|------|-------|----------|
| 6.1 | Nhân viên không tồn tại | `"Kiểm phép nhân viên XYZ999"` | `EMPLOYEE_NOT_FOUND` |
| 6.2 | Đơn không tồn tại | `"Xem đơn LR-9999"` | `REQUEST_NOT_FOUND` |
| 6.3 | Task không tồn tại | `"Xem task T-999"` | `TASK_NOT_FOUND` |

---

## 7. SSE Streaming

| # | Test | Expected |
|---|------|----------|
| 7.1 | Stream real-time | Trace events hiện ngay khi tool chạy, chunks stream từng phần |
| 7.2 | Stream format | `data: {"type": "trace", ...}` → `data: {"type": "chunk", ...}` → `data: {"type": "done", ...}` |

```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Kiểm tra phép E001"}' --max-time 60
```

---

## 8. Session Management

| # | Test | Endpoint | Expected |
|---|------|----------|----------|
| 8.1 | Xem lịch sử chat | `GET /chat/{session_id}/history` | Trả về messages array |
| 8.2 | Liệt kê sessions | `GET /sessions` | Trả về tất cả sessions |
| 8.3 | Session không tồn tại | `GET /chat/invalid-id/history` | 404 |

---

## 9. Dashboard API (CRUD)

### 9.1 Employees

```bash
# Liệt kê nhân viên
curl http://localhost:8000/employees

# Lọc theo phòng ban
curl "http://localhost:8000/employees?department=Engineering"

# Xem chi tiết
curl http://localhost:8000/employees/E001
```

### 9.2 Leave Requests

```bash
# Liệt kê đơn nghỉ
curl http://localhost:8000/leave-requests

# Lọc theo status
curl "http://localhost:8000/leave-requests?status=submitted"

# Tạo đơn mới (qua API)
curl -X POST http://localhost:8000/leave-requests \
  -H "Content-Type: application/json" \
  -d '{"employee_id": "E001", "type": "annual_leave", "start_date": "2026-06-20", "end_date": "2026-06-22", "reason": "test"}'

# Cập nhật đơn
curl -X PATCH http://localhost:8000/leave-requests/LR-1024 \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### 9.3 Tasks

```bash
# Liệt kê tasks
curl http://localhost:8000/tasks

# Tạo task (qua API)
curl -X POST "http://localhost:8000/tasks?creator_id=E001" \
  -H "Content-Type: application/json" \
  -d '{"title": "New task", "assignee_id": "E002", "due_date": "2026-06-20"}'

# Cập nhật task (drag-drop)
curl -X PATCH http://localhost:8000/tasks/T-001 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Xóa task
curl -X DELETE http://localhost:8000/tasks/T-001
```

---

## 10. Frontend Dashboard

| # | Tab | Test | Expected |
|---|-----|------|----------|
| 10.1 | Tasks | Kéo task sang cột khác | PATCH `/tasks/{id}`, UI cập nhật |
| 10.2 | Tasks | F5 reload | Tasks vẫn hiển thị (data từ JSON file) |
| 10.3 | Leave | Xem danh sách | Hiển thị đơn nghỉ từ JSON file |
| 10.4 | Employees | Xem danh sách | Hiển thị nhân viên từ JSON file |
| 10.5 | Chat | Gửi tin nhắn | Streaming real-time, tool trace hiện ngay |
| 10.6 | Chat | F5 reload | Conversations giữ nguyên (localStorage) |
| 10.7 | Chat | Tạo conversation mới | Sidebar cập nhật |
| 10.8 | Chat | Xóa conversation | Sidebar cập nhật |

---

## 11. Multi-step ReAct Loop

| # | Test | Input | Expected |
|---|------|-------|----------|
| 11.1 | Check balance trước khi tạo đơn | `"Tôi muốn nghỉ phép 3 ngày"` | Agent gọi `Check_Leave_Balance` → hỏi thông tin → gọi `Create_Leave_Request` |
| 11.2 | Tìm NV trước khi xem thông tin | `"Cho tôi xem thông tin nhân viên phòng Engineering"` | Agent gọi `Search_Employees` → trả kết quả |

---

## Test Data

### Nhân viên có sẵn

| ID | Tên | Role | Phòng ban |
|----|-----|------|-----------|
| E001 | Nguyễn Văn An | employee | Engineering |
| M001 | Trần Minh Quân | manager | Engineering |
| HR001 | Lê Thị Hương | hr_admin | Human Resources |

### Tools có sẵn (20 tools)

| Nhóm | Tools |
|------|-------|
| HR Policy | `Search_HR_Policy` |
| Leave | `Check_Leave_Balance`, `Calculate_Leave_Days`, `Create_Leave_Request`, `Get_Leave_Request`, `List_Leave_Requests`, `Update_Leave_Request`, `Cancel_Leave_Request` |
| User Mgmt | `Create_Employee`, `Get_Employee`, `Search_Employees`, `Update_Employee`, `Deactivate_Employee`, `Activate_Employee`, `Update_Leave_Balance` |
| Task | `Create_Task`, `Get_Task`, `List_Tasks`, `Update_Task`, `Delete_Task`, `Search_Tasks` |

### Write tools (cần xác nhận)

`Create_Leave_Request`, `Update_Leave_Request`, `Cancel_Leave_Request`, `Create_Employee`, `Update_Employee`, `Deactivate_Employee`, `Activate_Employee`, `Update_Leave_Balance`, `Create_Task`, `Update_Task`, `Delete_Task`

### HR Admin tools (chỉ hr_admin)

`Create_Employee`, `Update_Employee`, `Deactivate_Employee`, `Activate_Employee`, `Update_Leave_Balance`
