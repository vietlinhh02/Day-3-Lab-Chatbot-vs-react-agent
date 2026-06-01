# Đặc tả sản phẩm

## 1. Vấn đề

Phòng nhân sự thường phải trả lời các câu hỏi lặp lại:

- Nghỉ ốm có cần giấy khám bệnh không?
- Nhân viên còn bao nhiêu ngày phép?
- Nếu muốn nghỉ thì gửi đơn như thế nào?
- Đơn đã tạo có thể xem, sửa hoặc hủy không?
- HR tạo và quản lý hồ sơ nhân viên như thế nào?

Nếu chỉ dùng chatbot, câu trả lời có thể nghe hợp lý nhưng không có bằng chứng
từ quy định công ty và không thực hiện được quy trình tiếp theo. Proactive HR &
Workflow Agent xử lý cả phần tư vấn lẫn phần hành động.

## 2. Người dùng chính

| Người dùng | Mục tiêu |
| --- | --- |
| Nhân viên | Hỏi chính sách, kiểm tra quyền lợi, tạo hoặc quản lý yêu cầu nhanh. |
| Quản lý trực tiếp | Nhận thông báo về đơn xin nghỉ và xử lý phê duyệt. |
| HR | Quản lý hồ sơ nhân viên, ngày phép và kiểm tra log quy trình. |

## 3. Use-case chính

Nhân viên bị sốt cao và muốn xin nghỉ thứ 2, thứ 3 tuần tới. Agent cần:

1. Hiểu ngữ cảnh là nghỉ ốm.
2. Tra cứu quy định về nghỉ ốm trong sổ tay nhân sự.
3. Kiểm tra số ngày phép ốm còn lại của nhân viên.
4. Trả lời rõ về yêu cầu giấy khám bệnh và số ngày phép.
5. Hỏi xác nhận trước khi tạo đơn.
6. Sau khi nhân viên xác nhận, tạo đơn xin nghỉ ốm.
7. Trả về mã đơn và thông báo đơn đã được gửi cho quản lý.

## 4. Yêu cầu chức năng

### FR-1: Tra cứu chính sách HR

Agent phải gọi `Search_HR_Policy` khi câu hỏi cần thông tin từ sổ tay nhân sự.
Kết quả trả về phải có nội dung chính sách và nguồn trích dẫn để tránh trả lời
không có căn cứ.

### FR-2: Kiểm tra ngày phép

Agent phải gọi `Check_Leave_Balance` khi người dùng hỏi về ngày phép còn lại
hoặc khi cần xác minh trước khi tạo đơn. Bản lab dùng file JSON tĩnh cho vài
nhân viên giả định.

### FR-3: Tạo đơn xin nghỉ

Agent chỉ được gọi tool tạo đơn sau khi người dùng xác nhận rõ ràng. Tool này
tạo request mới và có thể gửi webhook sang n8n để mô phỏng email cho quản lý.

### FR-4: CRUD yêu cầu xin nghỉ

Agent cần có khả năng quản lý vòng đời yêu cầu xin nghỉ thông qua tool calling:

- Create: tạo yêu cầu xin nghỉ mới.
- Read: xem chi tiết hoặc danh sách yêu cầu của nhân viên.
- Update: sửa ngày nghỉ, lý do hoặc loại nghỉ khi đơn còn được phép sửa.
- Delete/Cancel: hủy yêu cầu theo policy, không xóa cứng dữ liệu audit.

Chi tiết contract nằm trong [crud-tool-calling.md](crud-tool-calling.md).

### FR-5: Quản lý người dùng và nhân viên

Agent cần hỗ trợ HR admin thực hiện các nghiệp vụ quản lý nhân viên:

- tạo hồ sơ nhân viên mới
- xem hồ sơ nhân viên
- tìm kiếm nhân viên theo tên, email, phòng ban hoặc trạng thái
- cập nhật role, phòng ban, vị trí, quản lý trực tiếp
- khóa hoặc mở khóa tài khoản nhân viên
- cập nhật số ngày phép năm và phép ốm

Các thao tác ghi như tạo, sửa, khóa/mở khóa và cập nhật ngày phép phải có xác
nhận của người dùng. Chi tiết nằm trong [user-management.md](user-management.md).

### FR-6: Xử lý hội thoại nhiều bước

Agent phải nhớ trạng thái ngắn hạn của hội thoại. Ví dụ, câu "Có, tạo giúp tôi"
phải được hiểu là xác nhận tạo đơn cho khoảng ngày đã được đề cập ở lượt trước.

### FR-7: Log và trace

Mỗi lần agent gọi tool cần log:

- user input
- thought/action được parse
- tool name và arguments
- observation
- latency
- lỗi parse hoặc lỗi tool nếu có

## 5. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
| --- | --- |
| Local-first | Chạy được trên máy sinh viên bằng Ollama, không cần OpenAI key. |
| Minh bạch | Mọi kết luận về chính sách phải có observation từ RAG. |
| An toàn | Mọi thao tác ghi, sửa hoặc hủy cần xác nhận của người dùng. |
| Phân quyền | HR admin mới được tạo/sửa/khóa nhân viên và chỉnh ngày phép. |
| Dễ demo | Có endpoint FastAPI rõ ràng và mock data để chạy trong lab. |
| Dễ chấm điểm | Có trace thành công, trace lỗi, metrics và checklist evaluation. |

## 6. Ngoài phạm vi bản lab

- Không cần tích hợp HRIS thật.
- Không cần giao diện production.
- Không cần xử lý phê duyệt thật của quản lý.
- Không cần authentication phức tạp; có thể dùng `current_user` mock.
- Không cần đầy đủ IAM production; role có thể mock trong JSON.
- Không hard delete dữ liệu nghiệp vụ; hủy đơn bằng trạng thái `cancelled`.

## 7. Tiêu chí chấp nhận

Một bản demo được xem là đạt scope khi:

1. API `/chat` nhận câu hỏi nghỉ ốm và trả lời đúng dựa trên RAG.
2. Agent gọi được `Search_HR_Policy` và `Check_Leave_Balance` trong một lượt.
3. Agent không tạo, sửa hoặc hủy đơn khi chưa có xác nhận.
4. Sau câu xác nhận, agent tạo được yêu cầu xin nghỉ.
5. Agent đọc được chi tiết hoặc danh sách yêu cầu đã tạo.
6. Agent cập nhật hoặc hủy được yêu cầu theo rule trạng thái.
7. HR admin tạo, xem, sửa và khóa/mở khóa được hồ sơ nhân viên bằng tool call.
8. Agent từ chối thao tác quản lý nhân viên nếu role không đủ quyền.
9. Response cuối có mã đơn, loại nghỉ, ngày bắt đầu, ngày kết thúc và trạng thái.
10. Log có trace `Thought`, `Action`, `Observation` cho cả quá trình.
