# Đặc tả: Cơ chế tự bảo vệ hệ thống

## Mô tả
Tính năng "Cơ chế tự bảo vệ hệ thống" là lớp khiên chắn kỹ thuật số (Infrastructure Resilience) được cấu hình trên toàn bộ kiến trúc UniHub Workshop. Với đặc thù của một hệ thống săn vé sự kiện (Flash Sale) thường xuyên chịu áp lực lưu lượng đột biến và phải phụ thuộc vào các dịch vụ bên ngoài (Cổng thanh toán, Email Server), hệ thống áp dụng hai cơ chế cốt lõi: **Rate Limiting** để chống lại các đợt tấn công Spam/F5 liên tục, và **Circuit Breaker** để chủ động ngắt kết nối với bên thứ 3 khi chúng gặp sự cố, tránh tình trạng lỗi lây lan (Cascading Failures) làm sập toàn bộ máy chủ.

## Luồng chính
1. **Rate Limiting (Giới hạn tỷ lệ truy cập)**:
   - Tất cả API Request từ Client (Web/Mobile) đều đi qua một lớp kiểm soát (API Gateway hoặc Middleware).
   - Hệ thống đếm số lượng Request đến từ mỗi địa chỉ IP hoặc định danh User ID trong một khoảng thời gian nhất định, bộ đếm này được lưu và cập nhật siêu tốc trên Redis.
   - Nếu số lượng Request nằm trong ngưỡng an toàn (Ví dụ: 60 requests / 1 phút), hệ thống cho phép đi tiếp vào Controller để xử lý.
   - Khi vượt ngưỡng, hệ thống lập tức chặn Request và trả về lỗi HTTP 429 Too Many Requests.
2. **Circuit Breaker (Ngắt mạch tự động)**:
   - Mọi tương tác gọi sang API bên thứ 3 (Mock Payment Gateway, SMTP) đều bị bọc bởi bộ định tuyến ngắt mạch (Circuit Breaker).
   - Khi dịch vụ bên thứ 3 khỏe mạnh, mạch ở trạng thái `CLOSED` (Cho phép Request gọi qua bình thường).
   - Hệ thống liên tục đo lường tỷ lệ gọi thất bại hoặc timeout. Nếu lỗi vượt quá ngưỡng chịu đựng (Ví dụ: 50% lỗi trong 10 giây), mạch tự động chuyển sang trạng thái `OPEN` (Ngắt mạch). Ở trạng thái này, mọi lệnh gọi từ Node.js sang dịch vụ đó đều bị từ chối ngay lập tức (Fail-fast) mà không cần chờ Timeout.
   - Sau thời gian "hồi chiêu" (VD: 30 giây), mạch chuyển sang trạng thái `HALF-OPEN` để thử gửi một vài Request thăm dò. Nếu thành công, mạch đóng lại (`CLOSED`); nếu vẫn thất bại, mạch tiếp tục mở (`OPEN`).

## Kịch bản lỗi
- **Bị tấn công Spam/DDoS**: Một nhóm người dùng cố tình dùng Tool/Bot bắn hàng ngàn Request vào API Đăng ký vé. Rate Limiter (dùng Redis) sẽ gánh tải và dội ngược các Request bất hợp lệ bằng lỗi 429 ở vòng ngoài cùng, giúp cho Database PostgreSQL và CPU của Server Node.js không bị treo.
- **Dịch vụ Thanh toán sập (Timeout Build-up)**: Cổng Mock Payment bị sập, mỗi Request thanh toán phải chờ 30s mới báo Timeout. Nếu không có Circuit Breaker, 10.000 sinh viên cùng chờ sẽ làm cạn kiệt luồng kết nối (Connection Pool) của Node.js, khiến mọi tính năng khác (kể cả xem danh sách) đều bị liệt. Khi có Circuit Breaker, hệ thống sẽ ngắt mạch tức thì. Các sinh viên bấm thanh toán sẽ nhận ngay thông báo "Bảo trì" dưới 1 mili-giây, giữ cho Server Node.js sống sót phục vụ các chức năng khác.

## Ràng buộc
- **Hiệu năng của Khiên chắn**: Cơ chế Rate Limiter bắt buộc phải dùng In-memory Database (Redis) để đọc/ghi nhằm đảm bảo tốc độ phản hồi cực nhỏ. Nghiêm cấm việc dùng PostgreSQL hay các CSDL vật lý để lưu bộ đếm Request.
- **Tính Cách ly (Fault Isolation)**: Khi Circuit Breaker "ngắt mạch" (OPEN) ở tính năng Cổng thanh toán, các luồng đăng ký vé sự kiện Miễn phí (Free) không được phép bị ảnh hưởng và vẫn phải hoạt động bình thường (Graceful Degradation).
- **Cấu hình Đa hình (Dynamic Limits)**: Hệ thống phải có khả năng thiết lập giới hạn Rate Limit khác nhau cho từng Endpoint. API Đọc (GET danh sách) có thể chịu 200 req/phút, nhưng API Ghi (POST Đăng ký vé/Thanh toán) chỉ cho phép tối đa 5 req/phút để tránh spam giao dịch.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Dùng công cụ Load Test (JMeter/K6) bắn 1.000 requests/giây từ cùng 1 địa chỉ IP vào API. Hệ thống chỉ xử lý số lượng quy định (VD: 60) và trả về HTTP 429 cho 940 Requests còn lại. Frontend bắt mã 429, không bị crash và hiện thông báo "Bạn thao tác quá nhanh, vui lòng chậm lại".
- Khi giả lập ngắt hoàn toàn dịch vụ Cổng thanh toán (không phản hồi), sau 10 giây lỗi liên tục, Circuit Breaker phải chuyển trạng thái. Sinh viên thao tác tiếp theo sẽ nhận ngay cảnh báo "Cổng thanh toán đang bảo trì" tức thì thay vì phải đợi Loading xoay vòng.
- Tại thời điểm Cổng thanh toán bị sập và ngắt mạch, các sinh viên khác đăng ký sự kiện miễn phí (Free) vẫn lấy được vé thành công.
- Mọi sự kiện ngắt/đóng mạch (Circuit Breaker OPEN/CLOSED) phải được log lại chi tiết để hệ thống giám sát (Monitoring) gửi cảnh báo (Alert) cho kỹ sư hệ thống.
