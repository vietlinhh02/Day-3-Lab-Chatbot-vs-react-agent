# Lab 3: Chatbot vs ReAct Agent

Đây là lab về quá trình chuyển từ chatbot LLM đơn giản sang **ReAct Agent** có
khả năng suy luận nhiều bước, gọi công cụ và ghi log để phân tích lỗi.

## Tài liệu đề tài HR Agent

Repo đã có bộ tài liệu cho đề tài **Proactive HR & Workflow Agent** trong
[`docs/`](docs/).

Hướng triển khai đề xuất:

- **FastAPI** cho backend API.
- **Ollama** để chạy LLM local.
- **RAG** trên PDF sổ tay nhân sự.
- **Tool calling** cho tra cứu chính sách, kiểm tra ngày phép và workflow xin nghỉ.
- **User management** để HR tạo, tìm kiếm, cập nhật và khóa/mở khóa nhân viên.
- **CRUD tool calling** để agent tạo, đọc, cập nhật và hủy yêu cầu xin nghỉ.

Bắt đầu từ: [`docs/README.md`](docs/README.md).

## Cài đặt môi trường

Copy `.env.example` sang `.env` và điền API keys nếu dùng provider cloud:

```bash
cp .env.example .env
```

Cài dependencies:

```bash
pip install -r requirements.txt
```

Extension point cho tool nằm tại:

```text
src/tools/
```

## Chạy model local bằng CPU

Nếu không muốn dùng OpenAI hoặc Gemini, bạn có thể chạy model local bằng
`llama-cpp-python`.

### 1. Tải model

Tải **Phi-3-mini-4k-instruct-q4.gguf** từ Hugging Face:

- [Phi-3-mini-4k-instruct-GGUF](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf)
- Tải file `phi-3-mini-4k-instruct-q4.gguf` từ trang model.

### 2. Đặt model vào project

Tạo thư mục `models/` ở root và đặt file `.gguf` vào đó.

### 3. Cập nhật `.env`

```env
DEFAULT_PROVIDER=local
LOCAL_MODEL_PATH=./models/Phi-3-mini-4k-instruct-q4.gguf
```

## Mục tiêu lab

1. **Baseline Chatbot**: quan sát giới hạn của chatbot khi gặp tác vụ nhiều bước.
2. **ReAct Loop**: implement chu trình `Thought -> Action -> Observation`.
3. **Provider Switching**: chuyển giữa OpenAI, Gemini và local provider.
4. **Failure Analysis**: dùng structured logs trong `logs/` để tìm lỗi.
5. **Grading & Bonus**: xem [SCORING.md](SCORING.md) để tối đa điểm.

## Cách dùng skeleton này

Code hiện tại là production prototype ở mức skeleton:

- **Telemetry**: mỗi action được log dạng JSON để phân tích.
- **Provider Pattern**: dễ mở rộng sang LLM API khác.
- **Clean Skeletons**: tập trung vào logic ReAct và tool calling.
