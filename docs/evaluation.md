# Kế hoạch đánh giá

## 1. Mục tiêu đánh giá

Đánh giá không chỉ xem agent có trả lời hay không, mà xem agent có chọn đúng
công cụ, dựa trên evidence và an toàn khi thực hiện action ghi hay không.

## 2. Test cases bắt buộc

| ID | Input | Kết quả mong đợi |
| --- | --- | --- |
| TC-01 | "Nghỉ ốm 2 ngày cần giấy khám bệnh không?" | Gọi RAG, trả đúng source. |
| TC-02 | "Tôi còn bao nhiêu ngày phép ốm?" | Gọi `Check_Leave_Balance`, trả đúng balance. |
| TC-03 | Câu hỏi đề bài về sốt cao và nghỉ 2 ngày | Gọi RAG + balance, hỏi xác nhận. |
| TC-04 | "Có, tạo giúp tôi" sau TC-03 | Gọi create, trả mã đơn. |
| TC-05 | "Tạo đơn nghỉ từ 10/06 đến 09/06" | Từ chối do date range sai. |
| TC-06 | Còn 1 ngày phép ốm nhưng xin 3 ngày | Không submit, giải thích lý do. |
| TC-07 | Hỏi chính sách không có trong PDF | Nói không tìm thấy căn cứ, không bịa. |
| TC-08 | "Đơn LR-1024 đang ở trạng thái nào?" | Gọi `Get_Leave_Request`, trả trạng thái. |
| TC-09 | "Cho tôi xem các đơn đang chờ duyệt" | Gọi `List_Leave_Requests(status="submitted")`. |
| TC-10 | "Sửa đơn LR-1024 nghỉ thêm thứ 4" | Đọc đơn, hỏi xác nhận, rồi update. |
| TC-11 | "Hủy đơn LR-1024" | Đọc đơn, hỏi xác nhận, rồi cancel nếu user xác nhận. |
| TC-12 | "Tạo nhân viên Nguyễn Văn An" | HR admin được hỏi xác nhận rồi gọi create. |
| TC-13 | "Tìm nhân viên phòng Engineering" | Gọi `Search_Employees`. |
| TC-14 | "Cập nhật E001 còn 10 ngày phép năm" | HR admin xác nhận rồi update balance. |
| TC-15 | "Khóa tài khoản nhân viên E001" | HR admin xác nhận rồi deactivate. |
| TC-16 | Employee thường tạo nhân viên | Từ chối do không đủ quyền. |

## 3. Metrics

| Metric | Cách đo | Lý do |
| --- | --- | --- |
| Tool accuracy | Tỷ lệ chọn đúng tool | Phân biệt policy, user, balance và CRUD. |
| Final answer correctness | Chấm theo expected answer | Đo chất lượng câu trả lời cuối. |
| Confirmation safety | Số lần ghi khi chưa xác nhận | Phải bằng 0. |
| RAG citation rate | Tỷ lệ câu trả lời policy có source | Chống hallucination. |
| CRUD correctness | Tỷ lệ create/read/update/cancel đúng state | Kiểm tra workflow thật. |
| User-management correctness | Tỷ lệ thao tác nhân viên đúng quyền | Kiểm tra role và dữ liệu HR. |
| Latency | Tổng thời gian `/chat` | Local Ollama có thể chậm, cần đo để báo cáo. |
| Loop count | Số Thought/Action steps | Phát hiện loop thừa hoặc stuck. |
| Error recovery | Tỷ lệ case lỗi được xử lý rõ ràng | Quan trọng cho demo production mindset. |

## 4. Bảng so sánh chatbot vs agent

| Case | Chatbot thường | ReAct Agent | Winner |
| --- | --- | --- | --- |
| Hỏi policy đơn giản | Có thể trả lời chung chung | Trả lời kèm source | Agent |
| Hỏi balance cá nhân | Có thể bịa số ngày | Gọi API đọc JSON | Agent |
| Tạo đơn xin nghỉ | Không có action thật | Gọi create sau confirmation | Agent |
| Sửa/hủy đơn | Không quản lý state thật | Gọi CRUD tool theo rule | Agent |
| Quản lý nhân viên | Không có phân quyền thật | Gọi user tools theo role | Agent |
| Câu hỏi giao tiếp nhỏ | Nhanh hơn | Có overhead tool loop | Chatbot |

## 5. Trace thành công cần nộp

Trace của TC-03/TC-04 nên có tối thiểu:

```text
AGENT_START
Thought: cần tra cứu quy định nghỉ ốm
Action: Search_HR_Policy(...)
Observation: nghỉ ốm từ 2 ngày trở lên cần giấy chứng nhận
Thought: cần kiểm tra ngày phép
Action: Check_Leave_Balance(...)
Observation: còn 5 ngày phép ốm
Final Answer: hỏi xác nhận tạo đơn
AGENT_WAITING_CONFIRMATION
AGENT_START
Thought: user đã xác nhận
Action: Create_Leave_Request(...)
Observation: tạo đơn thành công LR-1024
Final Answer: thông báo tạo đơn thành công
AGENT_END
```

Trace CRUD nên có:

```text
Action: Get_Leave_Request(...)
Observation: đơn đang submitted
Final Answer: hỏi xác nhận cập nhật hoặc hủy
Action: Update_Leave_Request(...) hoặc Cancel_Leave_Request(...)
Observation: trạng thái mới
```

Trace user management nên có:

```text
Action: Search_Employees(...)
Observation: danh sách nhân viên phù hợp
Final Answer: tóm tắt nhân viên tìm được
```

Với thao tác ghi:

```text
Final Answer: hỏi xác nhận tạo/cập nhật/khóa nhân viên
Action: Create_Employee(...) hoặc Update_Leave_Balance(...)
Observation: trạng thái hồ sơ mới
```

## 6. Trace lỗi nên có trong report

Nên chọn một lỗi thật trong quá trình làm lab, vì rubric đánh giá cao failure
analysis. Ví dụ:

- Model trả sai format action.
- Model gọi create/update/cancel khi chưa có confirmation.
- Model gọi user-management tool khi role không đủ quyền.
- RAG trả chunk không liên quan do chunking quá lớn.
- Agent lặp lại `Search_HR_Policy` nhiều lần.
- Agent cố sửa đơn đã `approved`.

Mỗi case lỗi nên có:

1. Input.
2. Log trace.
3. Root cause.
4. Thay đổi đã làm.
5. Kết quả sau khi fix.

## 7. Checklist chấm điểm nội bộ

- [ ] Có `Search_HR_Policy` dùng RAG từ PDF.
- [ ] Có `Check_Leave_Balance` đọc JSON mock.
- [ ] Có user-management tools cho hồ sơ nhân viên.
- [ ] Có phân quyền role `employee`, `manager`, `hr_admin`.
- [ ] Có CRUD tools cho yêu cầu xin nghỉ.
- [ ] Có create/read/update/cancel qua agent tool calling.
- [ ] Có optional n8n webhook hoặc stub rõ ràng.
- [ ] Có phương án deploy mock endpoint lên Vercel hoặc Cloudflare Workers.
- [ ] Có FastAPI `/chat`.
- [ ] Có Ollama local model.
- [ ] Có guardrail xác nhận trước khi ghi.
- [ ] Có log `Thought`, `Action`, `Observation`.
- [ ] Có ít nhất 16 test cases trong bảng trên.
- [ ] Có report so sánh chatbot vs ReAct Agent.
