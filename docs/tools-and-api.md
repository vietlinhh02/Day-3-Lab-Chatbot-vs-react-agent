# Tools và API contracts

## 1. Tool inventory

| Tool | Kiểu | Mục đích |
| --- | --- | --- |
| `Search_HR_Policy` | Read/RAG | Tìm quy định trong sổ tay nhân sự. |
| `Check_Leave_Balance` | Read/API | Đọc số ngày phép của nhân viên. |
| `Create_Employee` | Create/API | Tạo hồ sơ nhân viên. |
| `Get_Employee` | Read/API | Xem hồ sơ nhân viên. |
| `Search_Employees` | Read/API | Tìm kiếm nhân viên. |
| `Update_Employee` | Update/API | Cập nhật hồ sơ nhân viên. |
| `Deactivate_Employee` | Update/API | Khóa hoặc vô hiệu hóa nhân viên. |
| `Activate_Employee` | Update/API | Mở khóa hoặc kích hoạt lại nhân viên. |
| `Update_Leave_Balance` | Update/API | Cập nhật số ngày phép. |
| `Create_Leave_Request` | Create/API | Tạo đơn xin nghỉ. |
| `Submit_Leave_Request` | Alias | Tên trong đề bài, map sang create. |
| `Get_Leave_Request` | Read/API | Xem chi tiết một đơn. |
| `List_Leave_Requests` | Read/API | Liệt kê đơn của nhân viên. |
| `Update_Leave_Request` | Update/API | Sửa đơn khi còn được phép sửa. |
| `Cancel_Leave_Request` | Delete/API | Hủy đơn, không xóa cứng dữ liệu. |

Chi tiết CRUD tool calling nằm trong
[crud-tool-calling.md](crud-tool-calling.md).

Chi tiết quản lý người dùng và nhân viên nằm trong
[user-management.md](user-management.md).

Ghi chú: nếu nhóm muốn giữ đúng tên tool trong đề bài, có thể expose
`Submit_Leave_Request` như alias của `Create_Leave_Request`.

## 2. Search_HR_Policy

Input:

```json
{
  "query": "Quy định nghỉ ốm, yêu cầu giấy khám bệnh",
  "top_k": 3
}
```

Output thành công:

```json
{
  "answer": "Nghỉ ốm từ 2 ngày trở lên bắt buộc phải có giấy chứng nhận của bệnh viện.",
  "sources": [
    {
      "document": "company_handbook.pdf",
      "page": 12,
      "chunk_id": "policy-sick-leave-003",
      "score": 0.86
    }
  ]
}
```

Lỗi có thể gặp:

```json
{
  "error": "NO_RELEVANT_POLICY_FOUND",
  "message": "Không tìm thấy chính sách liên quan trong sổ tay nhân sự."
}
```

## 3. Check_Leave_Balance

Input:

```json
{
  "employee_id": "current_user"
}
```

Output:

```json
{
  "employee_id": "E001",
  "name": "Nguyễn Văn An",
  "annual_leave_remaining": 4,
  "sick_leave_remaining": 5,
  "unpaid_leave_available": true,
  "manager_email": "manager@example.com"
}
```

Mock file:

```json
{
  "employees": [
    {
      "employee_id": "E001",
      "alias": "current_user",
      "name": "Nguyễn Văn An",
      "annual_leave_remaining": 4,
      "sick_leave_remaining": 5,
      "manager_email": "manager@example.com"
    },
    {
      "employee_id": "E002",
      "alias": "demo_user",
      "name": "Trần Thị Bình",
      "annual_leave_remaining": 9,
      "sick_leave_remaining": 1,
      "manager_email": "lead@example.com"
    }
  ]
}
```

Trong bản có user management, dữ liệu balance có thể được đọc trực tiếp từ
`employees.json` thay vì duy trì riêng `leave_balances.json`.

## 4. Create_Leave_Request

Input:

```json
{
  "employee_id": "current_user",
  "type": "sick_leave",
  "start_date": "2026-06-08",
  "end_date": "2026-06-09",
  "reason": "Sốt cao"
}
```

Output:

```json
{
  "request_id": "LR-1024",
  "status": "submitted",
  "employee_id": "E001",
  "type": "sick_leave",
  "start_date": "2026-06-08",
  "end_date": "2026-06-09",
  "manager_notified": true
}
```

Validation:

- `type` chỉ nhận `sick_leave`, `annual_leave`, `unpaid_leave`.
- `start_date` và `end_date` dùng định dạng `YYYY-MM-DD`.
- `end_date` không được trước `start_date`.
- Agent phải có confirmation trước khi gọi tool.

Local persistence:

```json
{
  "request_id": "LR-1024",
  "employee_id": "E001",
  "type": "sick_leave",
  "start_date": "2026-06-08",
  "end_date": "2026-06-09",
  "status": "submitted"
}
```

Mỗi request mới được append vào `leave_requests.jsonl`.

## 5. Optional n8n webhook

Khi có `N8N_WEBHOOK_URL`, backend POST payload:

```json
{
  "event": "leave_request_submitted",
  "request_id": "LR-1024",
  "employee_name": "Nguyễn Văn An",
  "leave_type": "sick_leave",
  "start_date": "2026-06-08",
  "end_date": "2026-06-09",
  "manager_email": "manager@example.com",
  "message": "Nhân viên Nguyễn Văn An vừa gửi đơn xin nghỉ ốm."
}
```

Nếu webhook lỗi, tool nên trả về `manager_notified: false` và message lỗi ngắn
gọn. Không được làm mất đơn đã tạo local.

## 6. FastAPI endpoints đề xuất

### GET /health

Response:

```json
{
  "status": "ok",
  "ollama": "reachable",
  "vector_store": "ready"
}
```

### POST /chat

Request:

```json
{
  "session_id": "demo-session-001",
  "employee_id": "current_user",
  "message": "Tôi bị sốt cao, muốn xin nghỉ thứ 2 và thứ 3 tuần tới."
}
```

Response:

```json
{
  "session_id": "demo-session-001",
  "message": "Theo quy định...",
  "requires_confirmation": true,
  "trace_id": "trace-20260601-0001"
}
```

### POST /rag/ingest

Request:

```json
{
  "path": "./src/data/hr_policy/company_handbook.pdf",
  "collection": "hr_policy"
}
```

Response:

```json
{
  "collection": "hr_policy",
  "documents": 1,
  "chunks": 42,
  "status": "indexed"
}
```

### CRUD endpoints

| Endpoint | Mục đích |
| --- | --- |
| `POST /leave-requests` | Tạo yêu cầu xin nghỉ. |
| `GET /leave-requests/{request_id}` | Xem chi tiết yêu cầu. |
| `GET /employees/{employee_id}/leave-requests` | Liệt kê yêu cầu của nhân viên. |
| `PATCH /leave-requests/{request_id}` | Cập nhật yêu cầu. |
| `DELETE /leave-requests/{request_id}` | Hủy yêu cầu bằng trạng thái `cancelled`. |

### User management endpoints

| Endpoint | Mục đích |
| --- | --- |
| `POST /employees` | Tạo hồ sơ nhân viên. |
| `GET /employees/{employee_id}` | Xem chi tiết hồ sơ nhân viên. |
| `GET /employees` | Tìm kiếm hoặc lọc danh sách nhân viên. |
| `PATCH /employees/{employee_id}` | Cập nhật hồ sơ nhân viên. |
| `POST /employees/{employee_id}/deactivate` | Khóa hoặc vô hiệu hóa nhân viên. |
| `POST /employees/{employee_id}/activate` | Kích hoạt lại nhân viên. |
| `PATCH /employees/{employee_id}/leave-balance` | Cập nhật số ngày phép. |

## 7. Lỗi và mã lỗi nên dùng

| Code | Khi nào dùng |
| --- | --- |
| `NO_RELEVANT_POLICY_FOUND` | RAG không có chunk liên quan. |
| `EMPLOYEE_NOT_FOUND` | Không tìm thấy employee trong JSON. |
| `EMAIL_ALREADY_EXISTS` | Email nhân viên đã tồn tại. |
| `INVALID_MANAGER` | Manager không tồn tại hoặc không đúng role. |
| `FORBIDDEN` | Role hiện tại không đủ quyền thực hiện thao tác. |
| `INVALID_LEAVE_BALANCE` | Số ngày phép không hợp lệ. |
| `INSUFFICIENT_LEAVE_BALANCE` | Số ngày xin nghỉ vượt quá balance. |
| `CONFIRMATION_REQUIRED` | Có ý định ghi nhưng user chưa xác nhận. |
| `INVALID_DATE_RANGE` | Ngày kết thúc trước ngày bắt đầu. |
| `REQUEST_NOT_FOUND` | Không tìm thấy đơn xin nghỉ. |
| `INVALID_STATUS_TRANSITION` | Trạng thái hiện tại không cho phép sửa/hủy. |
| `WEBHOOK_FAILED` | Lưu đơn thành công nhưng gửi n8n lỗi. |
