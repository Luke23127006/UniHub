# Đặc tả: Tóm tắt AI (UC05)

## Mô tả
Tính năng "Tóm tắt AI" tự động hóa việc tóm lược nội dung của các sự kiện (workshops) từ tài liệu đính kèm do Ban tổ chức cung cấp. Khi Admin tải lên một file giới thiệu sự kiện (định dạng PDF), hệ thống sẽ tự động trích xuất văn bản và gọi API của Mô hình Ngôn ngữ Lớn (LLM - như Google Gemini hoặc OpenAI) để tạo ra một bản tóm tắt ngắn gọn, súc tích. Bản tóm tắt này sau đó được hiển thị trên trang chi tiết sự kiện của sinh viên, giúp các bạn nắm bắt nhanh giá trị cốt lõi của workshop trước khi quyết định đăng ký. Toàn bộ quá trình xử lý AI diễn ra dưới nền (Background) để không làm gián đoạn luồng làm việc của Admin.

## Luồng chính
1. Ban tổ chức (Admin) tạo mới hoặc chỉnh sửa một workshop trên Dashboard và tải lên file giới thiệu (định dạng PDF).
2. Khi Admin ấn "Lưu", Client upload file (lên Cloud Storage) và gọi API tạo/cập nhật workshop.
3. Backend tiếp nhận URL của file PDF, cập nhật bản ghi workshop vào PostgreSQL, và phản hồi thành công (HTTP 200/201) ngay lập tức cho Admin.
4. Cùng lúc đó, Backend đẩy một thông điệp (Message Event: `pdf.uploaded.event`) chứa `workshop_id` và URL của file PDF vào hàng đợi RabbitMQ.
5. Một Background Worker (Consumer) nhận Message từ RabbitMQ và bắt đầu luồng xử lý AI:
   - Worker tải file PDF từ Cloud Storage về bộ nhớ tạm.
   - Sử dụng thư viện phân tích cú pháp (như `pdf-parse`) để trích xuất toàn bộ văn bản (Text Extraction).
   - Làm sạch văn bản (loại bỏ ký tự đặc biệt, khoảng trắng thừa, header/footer rác).
   - Đóng gói văn bản cùng với Prompt (Ví dụ: "Hãy tóm tắt ngắn gọn nội dung sự kiện sau trong vòng 200 chữ, nhấn mạnh vào lợi ích cho sinh viên") và gửi HTTP Request sang API của Gemini/OpenAI.
6. Khi nhận được kết quả (Response) từ AI, Worker lưu đoạn văn bản tóm tắt này vào trường `ai_summary` của bảng Workshop trong cơ sở dữ liệu.
7. Worker thực hiện xóa/làm mới Cache (Redis Invalidation) của workshop tương ứng để Frontend có thể hiển thị ngay lập tức bản tóm tắt mới.

## Kịch bản lỗi
- **File PDF không hợp lệ (Lỗi trích xuất)**: Nếu file PDF bị hỏng, bị mã hóa mật khẩu, hoặc toàn bộ trang là file ảnh scan (chưa chạy OCR) khiến thư viện không trích xuất được chữ, Worker sẽ đánh dấu trạng thái tóm tắt của workshop là `FAILED` (Thất bại) kèm lý do. Giao diện sinh viên chỉ đơn giản là ẩn phần tóm tắt AI mà không báo lỗi.
- **Lỗi từ AI Provider (Timeout / Rate Limit)**: Nếu API của Gemini/OpenAI bị timeout, hệ thống sập, hoặc trả về lỗi HTTP 429 (Too Many Requests), Worker sẽ không bỏ qua (drop) Message mà sử dụng cơ chế Dead Letter Queue kết hợp Exponential Backoff để tự động thử lại (Retry) sau một khoảng thời gian.
- **Văn bản quá dài (Token Limit Exceeded)**: Nếu nội dung file PDF quá dài vượt quá giới hạn Context Window (Token limit) của LLM, Worker sẽ chủ động cắt bỏ và chỉ lấy `N` ký tự đầu tiên (ví dụ: 15.000 ký tự) đủ để tóm tắt, tránh bị API từ chối.

## Ràng buộc
- **Bất đồng bộ (Asynchronous Processing)**: Quá trình tải PDF, trích xuất văn bản và chờ API AI phản hồi có thể tốn từ vài giây đến vài chục giây. Tuyệt đối KHÔNG được chặn (block) API lưu workshop của Admin. Việc xử lý này bắt buộc phải đưa vào RabbitMQ để tách rời (Decouple).
- **Chi phí & Vận hành (Cost Control)**: Việc gọi API AI tốn phí token, do đó hệ thống cần thiết lập giới hạn dung lượng/độ dài của file PDF được phép upload để phân tích AI (ví dụ: tối đa 5MB hoặc 20 trang).
- **Bảo vệ Hệ thống**: Nếu API AI liên tục thất bại, hệ thống Worker phải có khả năng ngắt mạch (Circuit Breaker) để không vắt kiệt tài nguyên (CPU/RAM) khi cố gắng retry vô ích.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Thao tác nhấn "Lưu" workshop của Admin (có kèm PDF) hoàn thành cực nhanh (< 1 giây) và giao diện được chuyển hướng ngay lập tức, không phải chờ quá trình xử lý AI kết thúc.
- Sau một vài giây/phút, nếu tải lại trang chi tiết sự kiện trên ứng dụng sinh viên, sẽ thấy một đoạn văn bản tóm tắt mới xuất hiện (hiển thị kèm huy hiệu/icon AI).
- Khi upload một file PDF rỗng hoặc file ảnh toàn tập (không có chữ), hệ thống vẫn tạo workshop thành công nhưng bỏ qua phần tạo tóm tắt AI mà không gây lỗi (crash) Worker.
- Tắt kết nối Internet của Server Background Worker (giả lập lỗi rớt mạng không gọi được API AI), đăng workshop. Message tạo tóm tắt không được biến mất mà phải nằm chờ an toàn trong hàng đợi RabbitMQ. Khi cấp mạng trở lại, Worker tự động tiêu thụ lại Message và lưu thành công bản tóm tắt vào CSDL.
