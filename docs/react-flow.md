# Luồng ReAct

## 1. Format bắt buộc

Agent nên dùng format nhất quán để backend dễ parse:

```text
Thought: <lý do cần làm bước tiếp theo>
Action: <tool_name>({"arg": "value"})
```

Sau khi backend gọi tool, backend thêm observation vào context:

```text
Observation: <kết quả tool>
```

Khi đã đủ thông tin:

```text
Final Answer: <câu trả lời cho người dùng>
```

## 2. Tool specs đưa vào system prompt

```text
You are Proactive HR & Workflow Agent.
Answer in Vietnamese.
Use tools when the answer depends on HR policy, employee profile, employee
leave balance, or leave-request workflow.

Rules:
- Do not invent HR policy.
- Do not invent employee profile, leave balance, or leave-request status.
- Ask for explicit confirmation before creating, updating, or cancelling a
  leave request or employee profile.
- Only hr_admin can create, update, deactivate, activate employees, or update
  leave balances.
- If a user confirms a previously proposed leave action, reuse the pending
  action details from conversation state.
- Return Final Answer when no more tool calls are needed.

Tools:
1. Search_HR_Policy({"query": string, "top_k": integer})
2. Check_Leave_Balance({"employee_id": string})
3. Create_Employee({...})
4. Get_Employee({"employee_id": string})
5. Search_Employees({...})
6. Update_Employee({"employee_id": string, "patch": object})
7. Deactivate_Employee({"employee_id": string, "reason": string})
8. Activate_Employee({"employee_id": string, "reason": string})
9. Update_Leave_Balance({...})
10. Create_Leave_Request({...})
11. Get_Leave_Request({"request_id": string})
12. List_Leave_Requests({"employee_id": string, "status": string})
13. Update_Leave_Request({"request_id": string, "patch": object})
14. Cancel_Leave_Request({"request_id": string, "reason": string})
```

Nếu nhóm muốn giữ nguyên tên trong đề bài, `Submit_Leave_Request` nên được map
sang cùng implementation với `Create_Leave_Request`.

## 3. Trace minh họa theo đề bài

### Lượt 1

User:

```text
Tôi bị sốt cao, muốn xin nghỉ thứ 2 và thứ 3 tuần tới. Công ty có yêu cầu
giấy khám bệnh không? Và tôi còn bao nhiêu ngày phép?
```

Thought 1:

```text
Người dùng cần biết quy định nghỉ ốm và số ngày phép còn lại. Trước tiên cần
tra cứu sổ tay nhân sự về nghỉ ốm và giấy khám bệnh.
```

Action 1:

```text
Search_HR_Policy({
  "query": "Quy định nghỉ ốm, yêu cầu giấy khám bệnh",
  "top_k": 3
})
```

Observation 1:

```text
Nghỉ ốm từ 2 ngày trở lên bắt buộc phải có giấy chứng nhận của bệnh viện để
hưởng nguyên lương. Source: company_handbook.pdf, page 12.
```

Thought 2:

```text
Đã có quy định về giấy khám bệnh. Cần kiểm tra quỹ phép của nhân viên hiện tại
để biết còn bao nhiêu ngày phép ốm.
```

Action 2:

```text
Check_Leave_Balance({
  "employee_id": "current_user"
})
```

Observation 2:

```text
Nhân viên current_user còn 4 ngày phép năm và 5 ngày phép ốm.
```

Thought 3:

```text
Nhân viên xin nghỉ 2 ngày và còn 5 ngày phép ốm, nên đủ điều kiện về số ngày.
Vì đây là thao tác tạo đơn, cần hỏi xác nhận trước khi submit.
```

Final Answer:

```text
Theo quy định, vì bạn xin nghỉ 2 ngày nên cần nộp bổ sung giấy khám bệnh để
hưởng nguyên lương. Bạn hiện còn 5 ngày phép ốm. Bạn có muốn mình tạo luôn đơn
xin nghỉ ốm cho thứ 2 và thứ 3 tuần tới không?
```

Trạng thái session cần lưu:

```json
{
  "pending_action": {
    "tool": "Create_Leave_Request",
    "employee_id": "current_user",
    "type": "sick_leave",
    "start_date": "<resolved_next_monday>",
    "end_date": "<resolved_next_tuesday>",
    "reason": "Sốt cao"
  }
}
```

### Lượt 2

User:

```text
Có, tạo giúp tôi.
```

Thought 4:

```text
Người dùng đã xác nhận pending action tạo đơn nghỉ ốm. Cần gọi tool create với
thông tin đã lưu trong session.
```

Action 3:

```text
Create_Leave_Request({
  "employee_id": "current_user",
  "type": "sick_leave",
  "start_date": "<resolved_next_monday>",
  "end_date": "<resolved_next_tuesday>",
  "reason": "Sốt cao"
})
```

Observation 3:

```text
Tạo đơn thành công, ID: LR-1024. Đơn đã được gửi đến quản lý trực tiếp.
```

Final Answer:

```text
Mình đã tạo xong đơn xin nghỉ ốm cho bạn (Mã đơn: LR-1024). Đơn đã được gửi
đến quản lý trực tiếp. Chúc bạn mau khỏe.
```

## 4. Xử lý ngày tương đối

Người dùng có thể nói "thứ 2 và thứ 3 tuần tới". Backend nên resolve thành ngày
cụ thể trước khi gọi tool ghi.

Ví dụ nếu ngày hiện tại là `2026-06-01`, "thứ 2 tuần tới" có thể được resolve
là `2026-06-08` và "thứ 3 tuần tới" là `2026-06-09`. Log cần lưu cả original
phrase và resolved date để debug.

## 5. Trace CRUD bổ sung

### Xem đơn

User:

```text
Đơn LR-1024 của tôi đang ở trạng thái nào?
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
Đơn LR-1024 của bạn đang chờ quản lý duyệt.
```

### Hủy đơn

User:

```text
Hủy đơn LR-1024 giúp tôi.
```

Agent phải đọc trạng thái đơn trước, sau đó hỏi xác nhận. Chỉ khi người dùng xác
nhận rõ ràng, agent mới gọi:

```text
Cancel_Leave_Request({
  "request_id": "LR-1024",
  "reason": "Người dùng xác nhận hủy qua hội thoại"
})
```

## 6. Trace quản lý nhân viên

User:

```text
Tạo giúp tôi một nhân viên mới tên Nguyễn Văn An, email an@example.com, phòng
Engineering, vị trí Backend Developer, quản lý M001.
```

Thought:

```text
Đây là thao tác tạo hồ sơ nhân viên. Cần kiểm tra role hiện tại là hr_admin và
hỏi xác nhận trước khi ghi dữ liệu.
```

Final Answer:

```text
Mình sẽ tạo hồ sơ nhân viên Nguyễn Văn An, email an@example.com, phòng
Engineering, vị trí Backend Developer, quản lý M001. Bạn xác nhận tạo không?
```

Sau khi user xác nhận:

```text
Create_Employee({
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

## 7. Các lỗi cần demo được

| Lỗi | Cách agent nên phản ứng |
| --- | --- |
| RAG không tìm thấy chính sách | Nói không tìm thấy căn cứ, đề nghị hỏi HR. |
| Số ngày phép không đủ | Giải thích số ngày còn lại và hỏi hướng xử lý. |
| User chưa xác nhận | Không gọi tool ghi, chỉ hỏi xác nhận. |
| Role không đủ quyền | Từ chối thao tác quản lý nhân viên. |
| Tool argument sai schema | Log parse error, yêu cầu model sửa action ở bước tiếp theo. |
| Webhook submit fail | Vẫn lưu ticket local, báo lỗi thông báo quản lý. |
| Đơn không tồn tại | Nói không tìm thấy mã đơn và hỏi lại request id. |
| Đơn đã duyệt | Không cho update/cancel, giải thích rule trạng thái. |
