# Đặc tả: Đăng ký & Thanh toán (UC02)

## Mô tả
Tính năng "Đăng ký & Thanh toán" là module cốt lõi của hệ thống UniHub Workshop, cho phép sinh viên ghi danh tham dự sự kiện (bao gồm cả sự kiện miễn phí và sự kiện có phí). Tính năng này được thiết kế với độ tin cậy cao để giải quyết bài toán tranh chấp dữ liệu (Race Condition) trong quá trình cấp phát vé bằng Redis Lock, đồng thời tích hợp cổng thanh toán (Mock Payment) an toàn với cơ chế Idempotency để chống việc trừ tiền hai lần. Quá trình xử lý hậu kiểm (như tạo mã QR, gửi email) được đưa vào hàng đợi (RabbitMQ) để tối ưu hóa thời gian phản hồi.

## Luồng chính
1. Sinh viên đã đăng nhập hợp lệ, chọn một workshop trên ứng dụng và nhấn nút "Đăng ký".
2. Client gửi một API Request (`POST /api/v1/tickets/register`) đính kèm `Idempotency-Key` (dạng UUID) trên Header để định danh duy nhất cho thao tác đăng ký này.
3. Backend tiếp nhận, áp dụng cơ chế Redis Lock (Distributed Lock) trên `workshop_id` để khóa tạm thời luồng cấp phát, tránh việc hai người cùng mua chiếc vé cuối cùng.
4. Backend kiểm tra số chỗ còn lại trong Database. Nếu còn chỗ, hệ thống trừ đi 1 ghế và tạo một bản ghi Ticket với trạng thái `RESERVED` (Giữ chỗ tạm thời, ví dụ có hiệu lực trong 10 phút).
5. Phân nhánh xử lý theo loại sự kiện:
   - **Miễn phí (Free)**: Hệ thống lập tức chuyển trạng thái Ticket sang `CONFIRMED`.
   - **Có phí (Paid)**: Hệ thống khởi tạo phiên giao dịch, điều hướng Client sang cổng thanh toán (Mock). Sinh viên thực hiện nhập thông tin và xác nhận.
6. Khi thanh toán trả về kết quả thành công, Backend cập nhật trạng thái Ticket sang `CONFIRMED` và Payment sang `SUCCESS`.
7. Backend đẩy một Message (Event: `ticket.created`) vào RabbitMQ.
8. Các Consumer worker chạy ngầm sẽ nhận Message từ RabbitMQ để thực hiện các tác vụ nặng:
   - Khởi tạo mã QR Code check-in và lưu đường dẫn vào database.
   - Gọi sang dịch vụ Notification (UC08) để gửi email xác nhận đính kèm vé điện tử cho sinh viên.
9. Client nhận phản hồi thành công và điều hướng sinh viên sang màn hình "Vé của tôi".

## Kịch bản lỗi
- **Tranh chấp chỗ ngồi (Hết vé)**: Nếu tại Bước 4, vé vừa hết đúng lúc sinh viên ấn đăng ký, Redis Lock sẽ đảm bảo chỉ người nhanh nhất lấy được vé. Người còn lại sẽ bị từ chối, hệ thống nhả Lock và trả về lỗi HTTP 409 Conflict kèm thông báo "Rất tiếc, workshop đã hết chỗ".
- **Lỗi mạng khi thanh toán / Retry**: Nếu request đăng ký hoặc thanh toán bị timeout hoặc rớt mạng, Client có thể gọi lại API kèm theo cùng một `Idempotency-Key` ban đầu. Backend đối chiếu key này (lưu trong Redis/DB) để nhận diện giao dịch trùng lặp, bỏ qua thao tác trừ tiền/giữ chỗ lần 2 và chỉ trả về trạng thái hiện tại.
- **Cổng thanh toán sập (Circuit Breaker Mở)**: Nếu dịch vụ Mock Payment liên tục báo lỗi, cơ chế Circuit Breaker sẽ kích hoạt trạng thái `OPEN` để ngắt kết nối. Giao diện tự động ẩn nút "Thanh toán" đối với các workshop có phí (kèm thông báo bảo trì thanh toán). Tuy nhiên, luồng đăng ký cho các workshop miễn phí vẫn tiếp tục hoạt động trơn tru nhờ tính cách ly (Isolation).
- **Hết thời gian giữ chỗ (Timeout)**: Nếu sinh viên không hoàn tất thanh toán trong vòng 10 phút, hệ thống (thông qua Cronjob hoặc cấu hình Redis Expiry) sẽ tự động hủy bản ghi `RESERVED` và hoàn trả lại 1 ghế trống cho người khác đăng ký.
- **Quá tải Request**: Nếu API nhận quá nhiều request cùng lúc, API Gateway/Rate Limiter sẽ từ chối bớt (trả về HTTP 429) hoặc hệ thống sẽ đưa request vào hàng đợi xử lý để bảo vệ Database.

## Ràng buộc
- **Tính nhất quán (Consistency)**: Tuyệt đối không được xảy ra tình trạng bán lố vé (Overselling). Số lượng Ticket được tạo ra phải đúng bằng hoặc nhỏ hơn số lượng ghế tối đa đã cấu hình cho workshop đó.
- **Tính toàn vẹn giao dịch (ACID)**: Quá trình tạo vé, ghi nhận thanh toán và trừ ghế trong PostgreSQL phải diễn ra trong cùng một Transaction để đảm bảo tính toàn vẹn dữ liệu.
- **Idempotency**: Cả API đăng ký và API thanh toán phải mang tính Idempotent. Một `Idempotency-Key` cần có thời gian hiệu lực cache ít nhất 24 giờ.
- **Hiệu năng**: Thao tác giữ chỗ ban đầu (Lock & Reserve) phải phản hồi nhanh dưới 1 giây. Các tác vụ tạo QR và gửi Email bắt buộc phải đẩy vào RabbitMQ để xử lý bất đồng bộ, không chặn luồng chính.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Việc đăng ký workshop miễn phí thành công ngay lập tức tạo ra một vé trạng thái `CONFIRMED` và có mã QR được xử lý ngầm gửi vào email.
- Việc đăng ký workshop có phí chỉ chuyển vé sang trạng thái `CONFIRMED` sau khi giao dịch thanh toán Mock thành công. Nếu bỏ ngang hoặc thanh toán thất bại, chỗ trống sẽ được hoàn lại sau 10 phút.
- Hệ thống vượt qua các bài test tải đồng thời (Concurrency Test): khi cấu hình 1 ghế trống và dùng script bắn 100 request cùng lúc, hệ thống chỉ tạo ra duy nhất 1 vé và báo lỗi cho 99 request còn lại nhờ Redis Lock.
- Gửi 2 request đăng ký/thanh toán giống hệt nhau (cùng `Idempotency-Key`) liên tiếp không được phép sinh ra 2 vé hay trừ tiền 2 lần.
- Giả lập lỗi sập Mock Payment API, đảm bảo rằng chức năng đăng ký workshop miễn phí vẫn hoạt động 100% không bị ảnh hưởng.
