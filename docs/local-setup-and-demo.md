# Cài đặt local và demo

## 1. Điều kiện máy

- Python 3.13.
- `uv` để tạo virtual environment và chạy backend.
- Ollama đang chạy local.
- Máy có đủ RAM cho model chat local.

## 2. Cài Ollama và model

Chạy Ollama:

```bash
ollama serve
```

Tải model chat và embedding:

```bash
ollama pull qwen2.5:7b-instruct
ollama pull nomic-embed-text
```

Có thể thay `qwen2.5:7b-instruct` bằng model khác nếu máy yếu hơn, nhưng nên
chọn model làm tốt instruction following và JSON.

## 3. Tạo môi trường Python

```bash
uv venv --python 3.13
uv pip install fastapi uvicorn ollama chromadb pypdf pydantic python-dotenv httpx
```

Nếu nhóm tiếp tục dùng `requirements.txt`, hãy thêm các dependency backend/RAG
vào file đó sau khi code được implement.

## 4. File `.env` đề xuất

```env
APP_ENV=local
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=qwen2.5:7b-instruct
OLLAMA_EMBED_MODEL=nomic-embed-text
VECTOR_DB_PATH=./src/data/vector_store
LEAVE_BALANCE_PATH=./src/data/leave_balances.json
EMPLOYEE_DATA_PATH=./src/data/employees.json
LEAVE_REQUEST_LOG_PATH=./src/data/leave_requests.jsonl
N8N_WEBHOOK_URL=
MAX_AGENT_STEPS=6
```

## 5. Chạy backend

Sau khi implement FastAPI theo [architecture.md](architecture.md):

```bash
uv run uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

Kiểm tra health:

```bash
curl http://localhost:8000/health
```

## 6. Ingest PDF sổ tay nhân sự

```bash
curl -X POST http://localhost:8000/rag/ingest \
  -H 'Content-Type: application/json' \
  -d '{"path":"./src/data/hr_policy/company_handbook.pdf","collection":"hr_policy"}'
```

Kết quả mong đợi:

```json
{
  "collection": "hr_policy",
  "documents": 1,
  "chunks": 42,
  "status": "indexed"
}
```

## 7. Demo end-to-end

Lượt 1:

```bash
curl -X POST http://localhost:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "demo-hr-001",
    "employee_id": "current_user",
    "message": "Tôi bị sốt cao, muốn xin nghỉ thứ 2 và thứ 3 tuần tới."
  }'
```

Response mong đợi:

```json
{
  "session_id": "demo-hr-001",
  "message": "Bạn cần nộp giấy khám bệnh. Bạn còn 5 ngày phép ốm.",
  "requires_confirmation": true
}
```

Lượt 2:

```bash
curl -X POST http://localhost:8000/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "session_id": "demo-hr-001",
    "employee_id": "current_user",
    "message": "Có, tạo giúp tôi."
  }'
```

Response mong đợi:

```json
{
  "session_id": "demo-hr-001",
  "message": "Mình đã tạo xong đơn xin nghỉ ốm cho bạn (Mã đơn: LR-1024).",
  "requires_confirmation": false
}
```

## 8. Demo riêng từng tool

RAG:

```bash
curl -X POST http://localhost:8000/tools/search-hr-policy \
  -H 'Content-Type: application/json' \
  -d '{"query":"nghỉ ốm 2 ngày có cần giấy khám bệnh không","top_k":3}'
```

Leave balance:

```bash
curl http://localhost:8000/employees/current_user/leave-balance
```

Create employee:

```bash
curl -X POST http://localhost:8000/employees \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Nguyễn Văn An",
    "email": "an@example.com",
    "role": "employee",
    "department": "Engineering",
    "position": "Backend Developer",
    "manager_id": "M001",
    "annual_leave_remaining": 12,
    "sick_leave_remaining": 5
  }'
```

Search employees:

```bash
curl 'http://localhost:8000/employees?department=Engineering&status=active'
```

Update employee:

```bash
curl -X PATCH http://localhost:8000/employees/E001 \
  -H 'Content-Type: application/json' \
  -d '{"position":"Senior Backend Developer"}'
```

Update leave balance:

```bash
curl -X PATCH http://localhost:8000/employees/E001/leave-balance \
  -H 'Content-Type: application/json' \
  -d '{"annual_leave_remaining":10,"reason":"Điều chỉnh theo hợp đồng mới"}'
```

Create request:

```bash
curl -X POST http://localhost:8000/leave-requests \
  -H 'Content-Type: application/json' \
  -d '{
    "employee_id": "current_user",
    "type": "sick_leave",
    "start_date": "2026-06-08",
    "end_date": "2026-06-09",
    "reason": "Sốt cao"
  }'
```

Get request:

```bash
curl http://localhost:8000/leave-requests/LR-1024
```

List requests:

```bash
curl 'http://localhost:8000/employees/current_user/leave-requests?status=submitted'
```

Update request:

```bash
curl -X PATCH http://localhost:8000/leave-requests/LR-1024 \
  -H 'Content-Type: application/json' \
  -d '{
    "end_date": "2026-06-10",
    "reason": "Sốt cao, cần nghỉ thêm một ngày"
  }'
```

Cancel request:

```bash
curl -X DELETE http://localhost:8000/leave-requests/LR-1024 \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Người dùng xác nhận hủy qua hội thoại"}'
```

## 9. Demo CRUD qua hội thoại

Sau khi tạo đơn, có thể demo các câu:

```text
Đơn LR-1024 của tôi đang ở trạng thái nào?
```

```text
Sửa đơn LR-1024 giúp tôi, tôi muốn nghỉ thêm thứ 4 nữa.
```

```text
Hủy đơn LR-1024 giúp tôi.
```

Điểm cần show: agent phải đọc đơn trước, hỏi xác nhận trước thao tác ghi, rồi
mới gọi tool update hoặc cancel.

## 10. Demo quản lý nhân viên qua hội thoại

Có thể demo các câu:

```text
Tạo giúp tôi một nhân viên mới tên Nguyễn Văn An, email an@example.com.
```

```text
Tìm các nhân viên đang active trong phòng Engineering.
```

```text
Cập nhật nhân viên E001 còn 10 ngày phép năm.
```

```text
Khóa tài khoản nhân viên E001 vì đã nghỉ việc.
```

Điểm cần show: các thao tác quản lý nhân viên chỉ chạy khi role là `hr_admin`,
và các thao tác ghi đều phải có xác nhận.

## 11. Nội dung cần show khi thuyết trình

1. So sánh chatbot thuần và ReAct Agent trên cùng câu hỏi.
2. Mở log trace để thấy agent gọi RAG trước, API balance sau.
3. Show agent dừng lại để hỏi xác nhận trước khi ghi.
4. Xác nhận `leave_requests.jsonl` có request mới.
5. Demo đọc, sửa và hủy đơn bằng CRUD tool calling.
6. Demo tạo, tìm kiếm, cập nhật và khóa nhân viên.
7. Nếu có n8n, show email/thông báo mô phỏng được gửi đến manager.

## 12. Tùy chọn deploy mock API

FastAPI local là đủ cho scope chính. Nếu nhóm muốn demo endpoint giả lập public:

- Đưa endpoint `Check_Leave_Balance` lên Vercel Python Function.
- Đưa user/CRUD endpoint hoặc webhook proxy lên Cloudflare Workers.
- Giữ ReAct backend local; tool adapter gọi URL public thông qua biến môi trường.
- Log cả request local và response serverless để report có bằng chứng.

Không đưa RAG vector store lên serverless trong bản lab nếu không cần thiết, vì
RAG cần file PDF, embedding model và persistent storage.
