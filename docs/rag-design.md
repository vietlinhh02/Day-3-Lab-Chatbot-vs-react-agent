# Thiết kế RAG

## 1. Mục tiêu

`Search_HR_Policy` phải trả lời dựa trên sổ tay nhân sự, không dựa trên tri nhớ
chung của LLM. Kết quả cần có citation tới file và trang để giảng viên kiểm tra.

## 2. Dữ liệu đầu vào

Tối thiểu cần một PDF:

```text
src/data/hr_policy/company_handbook.pdf
```

Nội dung mẫu nên có các mục:

- Quy định nghỉ ốm.
- Quy định nghỉ phép năm.
- Quy định giấy xác nhận y tế.
- Quy trình gửi đơn và thời gian phê duyệt.
- Nghi không lương.

Ví dụ nội dung cần có trong PDF:

```text
Nghỉ ốm từ 2 ngày làm việc liên tiếp trở lên bắt buộc phải có giấy chứng nhận
của bệnh viện hoặc phòng khám hợp lệ để được hưởng nguyên lương.
```

## 3. Ingestion pipeline

1. Đọc PDF bằng parser.
2. Tách text theo page.
3. Chia chunk 600-900 token, overlap 80-120 token.
4. Tạo embedding bằng Ollama embedding model.
5. Lưu vào vector DB local với metadata:
   - document name
   - page
   - chunk id
   - section title nếu có
6. Ghi log số chunk đã ingest.

Pseudo flow:

```text
for each page in pdf:
    text = extract_text(page)
    chunks = split(text, chunk_size=800, overlap=100)
    for chunk in chunks:
        embedding = ollama_embed(chunk)
        vector_db.upsert(chunk_id, embedding, text, metadata)
```

## 4. Vector database

Cho lab, ưu tiên vector DB local để setup nhanh:

- ChromaDB: dễ dùng, persist local, phù hợp demo.
- FAISS: nhẹ và nhanh, nhưng cần tự quản lý metadata.

Khuyến nghị: dùng ChromaDB cho bản đầu vì cần citation và persist đơn giản.

## 5. Retrieval

Input:

```text
Quy định nghỉ ốm, yêu cầu giấy khám bệnh
```

Bước query:

1. Normalize query tiếng Việt.
2. Tạo embedding cho query.
3. Search top-k chunks.
4. Lọc chunk có score quá thấp.
5. Trả về tối đa 3 chunk tốt nhất kèm metadata.
6. Để LLM tổng hợp câu trả lời dựa trên chunks.

## 6. Output format cho agent

Observation nên ngắn gọn, đủ căn cứ:

```text
Policy result: Nghỉ ốm từ 2 ngày trở lên bắt buộc phải có giấy chứng nhận của
bệnh viện để hưởng nguyên lương.
Sources: company_handbook.pdf page 12 chunk policy-sick-leave-003.
```

Không nên đưa quá nhiều raw chunk vào ReAct loop vì làm tăng token và dễ gây
nhiễu. Nếu cần audit, log raw chunks riêng trong trace.

## 7. Cách xử lý khi RAG yếu

| Tình huống | Xử lý |
| --- | --- |
| Không có chunk liên quan | Trả `NO_RELEVANT_POLICY_FOUND`. |
| Nhiều chunk mâu thuẫn | Trả các chunk và yêu cầu agent nói cần HR xác minh. |
| Score thấp | Agent nói "mình chưa tìm thấy quy định chắc chắn". |
| Query quá rộng | Agent có thể hỏi lại hoặc query lại với cụm từ cụ thể hơn. |

## 8. Kiểm thử RAG

Test cần có:

1. Query "nghỉ ốm 2 ngày có cần giấy khám bệnh không" trả đúng chính sách.
2. Query "nghỉ 1 ngày có cần giấy khám bệnh không" phân biệt ngưỡng 2 ngày.
3. Query "nghỉ phép năm" không trả nhầm chính sách nghỉ ốm.
4. Query không liên quan, ví dụ "chính sách mua laptop", trả no result.

## 9. Chatbot vs RAG Agent

Demo nên có một câu hỏi mà chatbot thuần dễ bịa:

```text
Nếu nghỉ ốm 2 ngày thì công ty có yêu cầu giấy khám bệnh không?
```

Chatbot thuần có thể trả theo kinh nghiệm chung. RAG Agent phải trả dựa trên
chunk được retrieve và nếu không có chunk thì không được khẳng định.
