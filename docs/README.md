# Proactive HR & Workflow Agent

Tên đề tài: **Proactive HR & Workflow Agent** (Trợ lý Nhân sự và Xử lý Yêu cầu
Tự động)

Nhóm bài toán: **Quản lý nhân sự công ty**.

Ứng dụng này giúp HR giảm các tác vụ lặp lại như trả lời câu hỏi về chính sách,
kiểm tra ngày phép và tạo yêu cầu xin nghỉ. Điểm khác biệt so với chatbot thường
là agent có thể đọc dữ liệu, gọi tool, hỏi xác nhận và thực hiện hành động ghi
dữ liệu khi người dùng cho phép.

## Kết quả cần đạt

Hệ thống được thiết kế theo các yêu cầu sau:

- Agent chạy local bằng Ollama.
- Backend viết bằng FastAPI.
- Có RAG trên sổ tay nhân sự dạng PDF.
- Có tool calling cho các công cụ nghiệp vụ.
- Có quản lý người dùng/nhân viên cho HR admin.
- Có CRUD tool calling để agent tạo, đọc, cập nhật và hủy yêu cầu xin nghỉ.
- Có mock API đọc file JSON tĩnh cho dữ liệu ngày phép.
- Có action POST tạo đơn xin nghỉ và tùy chọn bắn webhook sang n8n.
- Có trace minh họa `Thought`, `Action`, `Observation`, `Final Answer`.
- Có guardrail bắt buộc hỏi xác nhận trước mọi thao tác ghi.

## Tài liệu trong thư mục này

| File | Mục đích |
| --- | --- |
| [product-spec.md](product-spec.md) | Mô tả bài toán, use-case, yêu cầu và tiêu chí chấp nhận. |
| [architecture.md](architecture.md) | Kiến trúc FastAPI, Ollama, ReAct loop, RAG và tool layer. |
| [react-flow.md](react-flow.md) | Luồng ReAct chi tiết cho kịch bản nghỉ ốm trong đề bài. |
| [tools-and-api.md](tools-and-api.md) | Contract của các tool nghiệp vụ, REST endpoints và mock data. |
| [user-management.md](user-management.md) | Thiết kế quản lý người dùng và nhân viên. |
| [crud-tool-calling.md](crud-tool-calling.md) | Thiết kế CRUD để agent gọi tool an toàn. |
| [rag-design.md](rag-design.md) | Thiết kế ingest PDF, chunking, embedding, vector DB và retrieval. |
| [local-setup-and-demo.md](local-setup-and-demo.md) | Cách chạy local bằng Ollama và FastAPI, kèm script demo. |
| [evaluation.md](evaluation.md) | Test cases, metrics và checklist chấm điểm cho nhóm. |

## Điểm khác với chatbot thường

Chatbot thường chỉ sinh câu trả lời từ prompt hiện tại, nên dễ bỏ qua bước kiểm
tra ngày phép hoặc tự suy diễn chính sách. ReAct Agent có vòng lặp:

1. Suy nghĩ tác vụ tiếp theo.
2. Chọn tool phù hợp.
3. Đọc observation từ môi trường.
4. Tiếp tục cho đến khi đủ bằng chứng để trả lời hoặc cần hỏi xác nhận.

Trong đề tài HR, agent phải biết chuyển đổi linh hoạt giữa tác vụ đọc và tác vụ
ghi: đọc chính sách bằng RAG, đọc ngày phép bằng API, sau đó chỉ tạo đơn khi
người dùng đã xác nhận.

## Điểm nhấn kỹ thuật

- Chuyển đổi linh hoạt giữa đọc dữ liệu và ghi dữ liệu.
- Multi-step reasoning: một câu hỏi có thể kích hoạt nhiều tool theo thứ tự.
- RAG local trên PDF giúp câu trả lời về chính sách có căn cứ.
- Tool calling giúp agent thực hiện workflow thay vì chỉ trả lời văn bản.
- User management giúp HR tạo, tìm kiếm, cập nhật và khóa/mở khóa nhân viên.
- CRUD tool calling giúp agent quản lý vòng đời yêu cầu xin nghỉ.
- Mock endpoints có thể chạy local bằng FastAPI hoặc tách ra serverless trên
  Vercel/Cloudflare Workers để demo tích hợp.

## Scope triển khai

Tài liệu này là đặc tả để nhóm implement tiếp trên skeleton lab hiện có. Repo
hiện tại đã có khung `src/agent/agent.py`, provider pattern và telemetry. Khi
triển khai đề tài HR, nhóm nên bổ sung backend FastAPI, RAG store, user
management service, tool adapter và CRUD service theo cấu trúc được đề xuất
trong các tài liệu phía trên.
