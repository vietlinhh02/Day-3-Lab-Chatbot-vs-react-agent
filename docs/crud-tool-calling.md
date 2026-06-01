# CRUD tool calling cho agent

## 1. Mục tiêu

Phần này mô tả cách thiết kế CRUD để ReAct Agent có thể thao tác với yêu cầu xin
nghỉ một cách an toàn. CRUD ở đây không có nghĩa là cho LLM ghi file trực tiếp.
Agent chỉ được gọi tool có schema rõ ràng; backend FastAPI mới là nơi validate,
ghi dữ liệu và kiểm tra rule nghiệp vụ.

## 2. Entity chính

### LeaveRequest

```json
{
  "request_id": "LR-1024",
  "employee_id": "E001",
  "type": "sick_leave",
  "start_date": "2026-06-08",
  "end_date": "2026-06-09",
  "reason": "Sốt cao",
  "status": "submitted",
  "created_at": "2026-06-01T09:15:00+07:00",
  "updated_at": "2026-06-01T09:15:00+07:00",
  "manager_email": "manager@example.com"
}
```

Trạng thái hợp lệ:

| Status | Ý nghĩa |
| --- | --- |
| `draft` | Đơn nháp, có thể sửa hoặc hủy. |
| `submitted` | Đã gửi quản lý, chỉ cho sửa trong một số rule demo. |
| `approved` | Đã duyệt, không cho sửa hoặc hủy trong bản lab. |
| `rejected` | Bị từ chối, không cho sửa. |
| `cancelled` | Đã hủy, giữ lại để audit. |

## 3. Mapping CRUD sang tool

| CRUD | Tool agent gọi | HTTP endpoint đề xuất | Cần xác nhận? |
| --- | --- | --- | --- |
| Create | `Create_Leave_Request` | `POST /leave-requests` | Có |
| Read one | `Get_Leave_Request` | `GET /leave-requests/{request_id}` | Không |
| Read list | `List_Leave_Requests` | `GET /employees/{employee_id}/leave-requests` | Không |
| Update | `Update_Leave_Request` | `PATCH /leave-requests/{request_id}` | Có |
| Delete/Cancel | `Cancel_Leave_Request` | `DELETE /leave-requests/{request_id}` | Có |

Trong domain HR, không nên xóa cứng yêu cầu. `DELETE` chỉ chuyển trạng thái sang
`cancelled` để vẫn giữ lịch sử audit.

Tên `Submit_Leave_Request` trong đề bài có thể được giữ như alias của
`Create_Leave_Request`. Về bản chất, đây là thao tác Create trong CRUD.

## 4. Tool schemas cho system prompt

```text
Create_Leave_Request({
  "employee_id": string,
  "type": "sick_leave" | "annual_leave" | "unpaid_leave",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "reason": string
})

Get_Leave_Request({
  "request_id": string
})

List_Leave_Requests({
  "employee_id": string,
  "status": "draft" | "submitted" | "approved" | "rejected" | "cancelled" | "all"
})

Update_Leave_Request({
  "request_id": string,
  "patch": {
    "type": "sick_leave" | "annual_leave" | "unpaid_leave",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "reason": string
  }
})

Cancel_Leave_Request({
  "request_id": string,
  "reason": string
})
```

## 5. Quy tắc để agent chọn CRUD tool

| Ý định người dùng | Tool nên gọi |
| --- | --- |
| "Tạo đơn nghỉ giúp tôi" | `Create_Leave_Request` sau khi xác nhận. |
| "Đơn nghỉ của tôi trạng thái thế nào?" | `List_Leave_Requests` hoặc `Get_Leave_Request`. |
| "Sửa đơn LR-1024 nghỉ thêm thứ 4" | Đọc đơn, hỏi xác nhận, rồi update. |
| "Hủy đơn LR-1024" | `Get_Leave_Request`, hỏi xác nhận, rồi `Cancel_Leave_Request`. |
| "Tôi còn đơn nào đang chờ duyệt không?" | `List_Leave_Requests(status="submitted")`. |

## 6. Rule xác nhận

Agent phải hỏi xác nhận trước các thao tác ghi:

- create
- update
- cancel

Ví dụ câu hỏi xác nhận:

```text
Mình sẽ cập nhật đơn LR-1024 thành nghỉ ốm từ 2026-06-08 đến 2026-06-10 với lý
do "Sốt cao". Bạn xác nhận cho mình thực hiện thay đổi này không?
```

Nếu user trả lời mơ hồ như "để xem đã" hoặc "chắc vậy", agent không được gọi
tool ghi. Chỉ các câu rõ như "có", "xác nhận", "đúng rồi", "tạo đi", "hủy đi"
mới được coi là confirmation.

## 7. REST contract đề xuất

### POST /leave-requests

Request:

```json
{
  "employee_id": "current_user",
  "type": "sick_leave",
  "start_date": "2026-06-08",
  "end_date": "2026-06-09",
  "reason": "Sốt cao"
}
```

Response:

```json
{
  "request_id": "LR-1024",
  "status": "submitted",
  "manager_notified": true
}
```

### GET /leave-requests/{request_id}

Response:

```json
{
  "request_id": "LR-1024",
  "employee_id": "E001",
  "type": "sick_leave",
  "start_date": "2026-06-08",
  "end_date": "2026-06-09",
  "reason": "Sốt cao",
  "status": "submitted"
}
```

### GET /employees/{employee_id}/leave-requests

Query params:

```text
status=submitted
limit=10
```

Response:

```json
{
  "employee_id": "E001",
  "items": [
    {
      "request_id": "LR-1024",
      "type": "sick_leave",
      "start_date": "2026-06-08",
      "end_date": "2026-06-09",
      "status": "submitted"
    }
  ]
}
```

### PATCH /leave-requests/{request_id}

Request:

```json
{
  "start_date": "2026-06-08",
  "end_date": "2026-06-10",
  "reason": "Sốt cao, cần nghỉ thêm một ngày"
}
```

Response:

```json
{
  "request_id": "LR-1024",
  "status": "submitted",
  "updated_fields": ["end_date", "reason"]
}
```

### DELETE /leave-requests/{request_id}

Request:

```json
{
  "reason": "Tôi đã khỏe và không cần nghỉ nữa"
}
```

Response:

```json
{
  "request_id": "LR-1024",
  "status": "cancelled"
}
```

## 8. Ví dụ ReAct: cập nhật đơn

User:

```text
Sửa đơn LR-1024 giúp tôi, tôi muốn nghỉ thêm thứ 4 nữa.
```

Thought:

```text
Cần đọc đơn hiện tại trước khi sửa để biết trạng thái và ngày đang có.
```

Action:

```text
Get_Leave_Request({"request_id": "LR-1024"})
```

Observation:

```text
Đơn LR-1024 đang ở trạng thái submitted, nghỉ từ 2026-06-08 đến 2026-06-09.
```

Final Answer:

```text
Mình sẽ cập nhật đơn LR-1024 thành nghỉ từ 2026-06-08 đến 2026-06-10. Bạn xác
nhận cho mình sửa đơn này không?
```

Sau khi user xác nhận:

```text
Action: Update_Leave_Request({
  "request_id": "LR-1024",
  "patch": {
    "end_date": "2026-06-10",
    "reason": "Sốt cao, cần nghỉ thêm một ngày"
  }
})
```

## 9. Ví dụ ReAct: hủy đơn

User:

```text
Hủy đơn LR-1024 giúp tôi.
```

Agent cần đọc đơn trước:

```text
Action: Get_Leave_Request({"request_id": "LR-1024"})
```

Nếu đơn còn hủy được, agent hỏi xác nhận:

```text
Đơn LR-1024 hiện đang chờ duyệt. Bạn xác nhận muốn hủy đơn này không?
```

Sau khi user xác nhận:

```text
Action: Cancel_Leave_Request({
  "request_id": "LR-1024",
  "reason": "Người dùng xác nhận hủy qua hội thoại"
})
```

## 10. Lỗi cần xử lý

| Code | Khi nào dùng | Cách agent trả lời |
| --- | --- | --- |
| `REQUEST_NOT_FOUND` | Không tìm thấy mã đơn | Nói không tìm thấy đơn và hỏi lại mã. |
| `FORBIDDEN` | Đơn không thuộc nhân viên hiện tại | Từ chối thao tác, không lộ dữ liệu. |
| `INVALID_STATUS_TRANSITION` | Đơn không còn sửa/hủy được | Giải thích rule trạng thái. |
| `CONFIRMATION_REQUIRED` | Tool ghi bị gọi khi chưa xác nhận | Dừng lại và hỏi xác nhận. |
| `INVALID_PATCH` | Patch rỗng hoặc field không hợp lệ | Hỏi lại thông tin cần sửa. |

## 11. Log bắt buộc

Mỗi CRUD tool call cần log:

- `trace_id`
- `session_id`
- `employee_id`
- `tool_name`
- `arguments`
- `request_id` nếu có
- `before_state` với update/cancel
- `after_state` với create/update/cancel
- `confirmation_source`
- `latency_ms`
- `error_code` nếu lỗi
