# Đặc tả: Hệ thống gửi Thông báo (UC08)

## Mô tả
Tính năng "Hệ thống gửi Thông báo" đóng vai trò như một module dịch vụ dùng chung (Shared Service) chịu trách nhiệm gửi các luồng thông tin giao tiếp quan trọng đến sinh viên (ví dụ: email xác nhận đăng ký, mã QR check-in, thông báo dời lịch hoặc hủy workshop). Nhằm tránh làm tắc nghẽn luồng xử lý chính của người dùng, module này được kiến trúc theo mô hình hướng sự kiện (Event-Driven Architecture), nơi toàn bộ quá trình giao tiếp với bên thứ 3 (Email/Push) đều được đưa vào Message Queue (RabbitMQ) và xử lý bất đồng bộ (Asynchronous).

## Luồng chính
1. Khi các tính năng nghiệp vụ lõi (UC02 - Đăng ký, UC03 - Quản lý) hoàn thành một thao tác, hệ thống sẽ phát (Publish) một sự kiện vào RabbitMQ (Ví dụ: `ticket.created.event`, `workshop.updated.event`).
2. Message Queue (RabbitMQ) tiếp nhận, lưu trữ an toàn các sự kiện này vào hàng đợi (Queue) thích hợp.
3. Các tiến trình Background Worker (Consumer) liên tục lắng nghe hàng đợi để kéo (pull) tin nhắn ra xử lý.
4. Dựa trên loại sự kiện, Worker trích xuất dữ liệu, lắp ráp vào các mẫu nội dung (Templates) đã được chuẩn bị sẵn (như mẫu Email HTML có chèn mã QR, hoặc Payload JSON cho Push Notification).
5. Worker thực hiện các lời gọi API qua các dịch vụ bên thứ 3 (như SMTP Server/SendGrid/AWS SES để gửi Email, Firebase Cloud Messaging để đẩy Push Notification về Mobile App).
6. Khi dịch vụ gửi trả về kết quả thành công, Backend ghi nhận lịch sử vào bảng Log Thông báo để quản trị viên có thể truy vết.

## Kịch bản lỗi
- **Dịch vụ Gửi thông báo (SMTP/Firebase) bị sập/Timeout**: Khi gọi API gửi tin nhưng không nhận được phản hồi hoặc báo lỗi Server (5xx), Worker không được xóa bỏ tin nhắn. Tin nhắn sẽ được áp dụng chiến lược thử lại (Exponential Backoff Retry - thử sau 1 phút, 5 phút, 15 phút). Nếu vượt quá số lần tối đa, đưa vào hàng đợi chết (Dead Letter Queue) để kiểm tra thủ công.
- **Dữ liệu người nhận không hợp lệ (Hard Bounce)**: Nếu sinh viên nhập sai định dạng email hoặc đã chủ động thu hồi quyền nhận Push Notification trên điện thoại, hệ thống sẽ nhận được lỗi 4xx. Lỗi này được ghi trực tiếp vào Log (trạng thái Failed) mà không cần thử lại để tránh lãng phí tài nguyên.
- **Hàng đợi quá tải (Queue Buildup)**: Trong tình huống Admin hủy một sự kiện lớn có 12.000 vé, hệ thống cần gửi 12.000 email cùng lúc. Worker có thể không xử lý kịp khiến hàng đợi phình to. Giải pháp là cơ sở hạ tầng (như K8s) sẽ tự động nhân bản (Scale-out) số lượng Background Worker để tiêu thụ tin nhắn nhanh hơn.

## Ràng buộc
- **Tuyệt đối Bất đồng bộ (Asynchronous)**: Mọi thao tác gọi API gửi email/push bắt buộc phải chạy dưới nền. Không bao giờ được phép chặn (block) chu trình Request-Response của luồng đăng ký hoặc tạo sự kiện.
- **Tính tách biệt (Decoupling)**: Module gửi thông báo không được phép biết hay chứa logic nghiệp vụ (Ví dụ: tính toán giá tiền vé). Nó chỉ có nhiệm vụ nhận dữ liệu thô từ Queue và "chuyển phát". Điều này giúp hệ thống dễ dàng thay nhà cung cấp gửi email mà không ảnh hưởng đến code của tính năng Đăng ký vé.
- **Quản lý Mẫu (Templating Engine)**: Nội dung Email và Push Notification phải được thiết kế dạng Template (Handlebars, EJS) để tách rời việc thiết kế giao diện khỏi mã nguồn lập trình logic.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Khi một sinh viên đăng ký vé thành công, màn hình trên App chuyển sang thông báo "Thành công" ngay lập tức (< 1 giây), và sinh viên sẽ nhận được Email đính kèm mã QR trong vòng từ 1 đến 3 phút sau đó.
- Khi Admin hủy một sự kiện có 10.000 sinh viên đã đăng ký, hệ thống đẩy thành công 10.000 Messages vào RabbitMQ. Quá trình gửi tuần tự diễn ra sau đó mà hoàn toàn không làm sập Server ứng dụng chính.
- Trong trường hợp giả lập ngắt hoàn toàn kết nối mạng của Background Worker (giả lập lỗi không gọi được SMTP), các Messages không được biến mất mà phải nằm chờ an toàn trong RabbitMQ cho đến khi có mạng trở lại để tiếp tục gửi.
- Các tin nhắn gửi thất bại do sai email được cập nhật rõ ràng trạng thái `FAILED` trong hệ thống quản trị Log nội bộ.
