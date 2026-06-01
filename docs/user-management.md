# Quản lý người dùng và nhân viên

## 1. Mục tiêu

Phần này mô tả các tính năng quản lý người dùng/nhân viên để agent có thể hỗ
trợ HR thực hiện các tác vụ quản trị cơ bản. Trong bản lab, dữ liệu có thể lưu
trong JSON để dễ demo. Khi triển khai thật, các contract này có thể chuyển sang
database mà không cần đổi prompt hoặc tool schema của agent.

## 2. Vai trò người dùng

| Role | Quyền chính |
| --- | --- |
| `employee` | Hỏi chính sách, xem ngày phép, tạo và quản lý đơn của chính mình. |
| `manager` | Xem nhân viên thuộc team, xem yêu cầu đang chờ duyệt. |
| `hr_admin` | Tạo, sửa, khóa/mở khóa hồ sơ nhân viên và cấu hình ngày phép. |

Trong lab có thể mock role bằng trường `role` trong request. Khi production,
role phải lấy từ authentication layer thay vì để client tự gửi.

## 3. Entity chính

### EmployeeProfile

```json
{
  "employee_id": "E001",
  "alias": "current_user",
  "full_name": "Nguyễn Văn An",
  "email": "an@example.com",
  "role": "employee",
  "department": "Engineering",
  "position": "Backend Developer",
  "manager_id": "M001",
  "manager_email": "manager@example.com",
  "employment_status": "active",
  "annual_leave_remaining": 4,
  "sick_leave_remaining": 5,
  "created_at": "2026-06-01T09:00:00+07:00",
  "updated_at": "2026-06-01T09:00:00+07:00"
}
```

### UserAccount

```json
{
  "user_id": "U001",
  "employee_id": "E001",
  "email": "an@example.com",
  "role": "employee",
  "status": "active",
  "last_login_at": "2026-06-01T08:30:00+07:00"
}
```

Trong bản lab có thể gộp `UserAccount` và `EmployeeProfile` thành một JSON nếu
muốn đơn giản. Tuy nhiên, docs vẫn tách hai khái niệm để nhóm hiểu rõ: account
dùng cho đăng nhập/phân quyền, profile dùng cho nghiệp vụ HR.

## 4. Mapping user management sang tool

| Nghiệp vụ | Tool agent gọi | Endpoint đề xuất | Cần xác nhận? |
| --- | --- | --- | --- |
| Tạo nhân viên | `Create_Employee` | `POST /employees` | Có |
| Xem nhân viên | `Get_Employee` | `GET /employees/{employee_id}` | Không |
| Tìm nhân viên | `Search_Employees` | `GET /employees` | Không |
| Cập nhật hồ sơ | `Update_Employee` | `PATCH /employees/{employee_id}` | Có |
| Khóa tài khoản | `Deactivate_Employee` | `POST /employees/{employee_id}/deactivate` | Có |
| Mở khóa tài khoản | `Activate_Employee` | `POST /employees/{employee_id}/activate` | Có |
| Cập nhật ngày phép | `Update_Leave_Balance` | `PATCH /employees/{employee_id}/leave-balance` | Có |

Không dùng hard delete cho nhân viên. Nếu nhân viên nghỉ việc, chuyển
`employment_status` sang `inactive` hoặc `terminated`.

## 5. Tool schemas cho system prompt

```text
Create_Employee({
  "full_name": string,
  "email": string,
  "role": "employee" | "manager" | "hr_admin",
  "department": string,
  "position": string,
  "manager_id": string,
  "annual_leave_remaining": integer,
  "sick_leave_remaining": integer
})

Get_Employee({
  "employee_id": string
})

Search_Employees({
  "query": string,
  "department": string,
  "role": string,
  "status": "active" | "inactive" | "terminated" | "all"
})

Update_Employee({
  "employee_id": string,
  "patch": {
    "full_name": string,
    "email": string,
    "role": "employee" | "manager" | "hr_admin",
    "department": string,
    "position": string,
    "manager_id": string
  }
})

Deactivate_Employee({
  "employee_id": string,
  "reason": string
})

Activate_Employee({
  "employee_id": string,
  "reason": string
})

Update_Leave_Balance({
  "employee_id": string,
  "annual_leave_remaining": integer,
  "sick_leave_remaining": integer,
  "reason": string
})
```

## 6. Quy tắc phân quyền

| Hành động | Ai được làm |
| --- | --- |
| Nhân viên xem hồ sơ của mình | `employee`, `manager`, `hr_admin` |
| Nhân viên xem hồ sơ người khác | `manager` trong team hoặc `hr_admin` |
| Tạo nhân viên | `hr_admin` |
| Cập nhật role, phòng ban, quản lý | `hr_admin` |
| Cập nhật ngày phép | `hr_admin` |
| Khóa/mở khóa tài khoản | `hr_admin` |
| Manager xem danh sách team | `manager`, `hr_admin` |

Agent phải kiểm tra role hiện tại trước khi gọi tool ghi. Nếu role không đủ
quyền, agent trả lời từ chối rõ ràng thay vì cố gọi tool.

## 7. Rule xác nhận

Agent phải hỏi xác nhận trước các thao tác có ảnh hưởng tới dữ liệu:

- tạo nhân viên mới
- cập nhật hồ sơ nhân viên
- cập nhật ngày phép
- khóa hoặc mở khóa tài khoản

Ví dụ:

```text
Mình sẽ tạo nhân viên mới Nguyễn Văn An, email an@example.com, thuộc phòng
Engineering, role employee, quản lý là M001. Bạn xác nhận tạo hồ sơ này không?
```

## 8. REST contract đề xuất

### POST /employees

Request:

```json
{
  "full_name": "Nguyễn Văn An",
  "email": "an@example.com",
  "role": "employee",
  "department": "Engineering",
  "position": "Backend Developer",
  "manager_id": "M001",
  "annual_leave_remaining": 12,
  "sick_leave_remaining": 5
}
```

Response:

```json
{
  "employee_id": "E001",
  "status": "active"
}
```

### GET /employees/{employee_id}

Response:

```json
{
  "employee_id": "E001",
  "full_name": "Nguyễn Văn An",
  "email": "an@example.com",
  "role": "employee",
  "department": "Engineering",
  "position": "Backend Developer",
  "manager_id": "M001",
  "employment_status": "active"
}
```

### GET /employees

Query params:

```text
query=an
department=Engineering
status=active
limit=20
```

Response:

```json
{
  "items": [
    {
      "employee_id": "E001",
      "full_name": "Nguyễn Văn An",
      "email": "an@example.com",
      "department": "Engineering",
      "status": "active"
    }
  ]
}
```

### PATCH /employees/{employee_id}

Request:

```json
{
  "department": "Platform",
  "position": "Senior Backend Developer",
  "manager_id": "M002"
}
```

Response:

```json
{
  "employee_id": "E001",
  "updated_fields": ["department", "position", "manager_id"]
}
```

### POST /employees/{employee_id}/deactivate

Request:

```json
{
  "reason": "Nhân viên đã nghỉ việc"
}
```

Response:

```json
{
  "employee_id": "E001",
  "employment_status": "inactive"
}
```

### PATCH /employees/{employee_id}/leave-balance

Request:

```json
{
  "annual_leave_remaining": 10,
  "sick_leave_remaining": 5,
  "reason": "Điều chỉnh theo hợp đồng mới"
}
```

Response:

```json
{
  "employee_id": "E001",
  "annual_leave_remaining": 10,
  "sick_leave_remaining": 5
}
```

## 9. Mock data đề xuất

File:

```text
src/data/employees.json
```

Nội dung mẫu:

```json
{
  "employees": [
    {
      "employee_id": "E001",
      "alias": "current_user",
      "full_name": "Nguyễn Văn An",
      "email": "an@example.com",
      "role": "employee",
      "department": "Engineering",
      "position": "Backend Developer",
      "manager_id": "M001",
      "manager_email": "manager@example.com",
      "employment_status": "active",
      "annual_leave_remaining": 4,
      "sick_leave_remaining": 5
    },
    {
      "employee_id": "M001",
      "alias": "demo_manager",
      "full_name": "Trần Minh Quân",
      "email": "manager@example.com",
      "role": "manager",
      "department": "Engineering",
      "position": "Engineering Manager",
      "manager_id": null,
      "employment_status": "active",
      "annual_leave_remaining": 8,
      "sick_leave_remaining": 5
    }
  ]
}
```

## 10. Ví dụ ReAct: tạo nhân viên

User:

```text
Tạo giúp tôi một nhân viên mới tên Nguyễn Văn An, email an@example.com, phòng
Engineering, vị trí Backend Developer, quản lý M001.
```

Thought:

```text
Đây là thao tác tạo hồ sơ nhân viên, cần kiểm tra quyền HR admin và hỏi xác nhận
trước khi ghi dữ liệu.
```

Final Answer:

```text
Mình sẽ tạo hồ sơ nhân viên Nguyễn Văn An với email an@example.com, phòng
Engineering, vị trí Backend Developer, quản lý M001. Bạn xác nhận tạo không?
```

Sau khi user xác nhận:

```text
Action: Create_Employee({
  "full_name": "Nguyễn Văn An",
  "email": "an@example.com",
  "role": "employee",
  "department": "Engineering",
  "position": "Backend Developer",
  "manager_id": "M001",
  "annual_leave_remaining": 12,
  "sick_leave_remaining": 5
})
```

## 11. Ví dụ ReAct: cập nhật ngày phép

User:

```text
Cập nhật nhân viên E001 còn 10 ngày phép năm.
```

Agent cần hỏi xác nhận vì đây là thao tác ghi:

```text
Mình sẽ cập nhật nhân viên E001 còn 10 ngày phép năm. Bạn xác nhận thay đổi này
không?
```

Sau khi user xác nhận:

```text
Action: Update_Leave_Balance({
  "employee_id": "E001",
  "annual_leave_remaining": 10,
  "sick_leave_remaining": 5,
  "reason": "HR admin xác nhận cập nhật qua hội thoại"
})
```

## 12. Lỗi cần xử lý

| Code | Khi nào dùng | Cách agent trả lời |
| --- | --- | --- |
| `EMPLOYEE_NOT_FOUND` | Không tìm thấy nhân viên | Hỏi lại mã nhân viên hoặc thông tin tìm kiếm. |
| `EMAIL_ALREADY_EXISTS` | Email đã có trong hệ thống | Báo trùng email, không tạo mới. |
| `FORBIDDEN` | Role hiện tại không đủ quyền | Từ chối thao tác và nêu quyền cần có. |
| `INVALID_MANAGER` | Manager không tồn tại hoặc không đúng role | Yêu cầu chọn manager hợp lệ. |
| `INVALID_LEAVE_BALANCE` | Số ngày phép không hợp lệ | Từ chối cập nhật. |
| `CONFIRMATION_REQUIRED` | Chưa có xác nhận cho thao tác ghi | Hỏi xác nhận trước khi gọi tool. |
