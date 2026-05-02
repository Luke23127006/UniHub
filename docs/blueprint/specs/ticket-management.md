# Đặc tả: Quản lý vé & QR Code

## Mô tả
Tính năng "Quản lý vé & QR Code" (thuộc phạm vi của UC02) cho phép sinh viên xem lại danh sách toàn bộ các workshop mà mình đã đăng ký tham gia (bao gồm cả vé miễn phí và vé có phí). Tính năng này cung cấp một mã QR định danh duy nhất cho từng vé để sinh viên sử dụng khi đi check-in tại cổng sự kiện. Mã QR được thiết kế bảo mật để chống giả mạo và ứng dụng được tối ưu hóa để hiển thị tốt ngay cả trong điều kiện mạng yếu.

## Luồng chính
1. Sinh viên mở ứng dụng (Web hoặc React Native App) và điều hướng đến mục "Vé của tôi" (My Tickets).
2. Client gửi yêu cầu (`GET /v1/tickets/my-tickets`) lên Backend (Node.js) đính kèm Access Token trên Header.
3. Backend xác thực Access Token, trích xuất `student_id` và truy vấn PostgreSQL để lấy danh sách các vé của sinh viên, được sắp xếp theo thời gian sự kiện mới nhất.
4. Backend trả về danh sách vé với các trạng thái phân loại rõ ràng (ví dụ: Sắp diễn ra, Đã tham gia, Đã hủy).
5. Sinh viên chọn một vé thuộc nhóm "Sắp diễn ra" để xem chi tiết.
6. Client gọi API lấy thông tin chi tiết mã QR (hoặc lấy URL ảnh QR Code đã được tạo trước đó).
7. Màn hình ứng dụng hiển thị thông tin vé (Tên workshop, Thời gian, Địa điểm, Chỗ ngồi) cùng với mã QR code định danh lớn ở giữa màn hình.
8. Tại cổng sự kiện, sinh viên đưa mã QR này cho nhân sự (Staff) quét. Trên Mobile App, độ sáng màn hình có thể tự động tăng tối đa để máy quét dễ nhận diện.

## Kịch bản lỗi
- **Truy cập trái phép (Lỗi IDOR)**: Nếu một người dùng cố tình thay đổi tham số ID để lấy mã QR của vé thuộc về người khác (`GET /api/v1/tickets/:id/qr`), Backend sẽ đối chiếu `ticket.student_id` với `req.user.sub` trong Token. Nếu không khớp, hệ thống chặn ngay lập tức và trả về lỗi HTTP 403 Forbidden. Nếu hệ thống có endpoint xem chi tiết vé tách biệt với endpoint lấy QR, endpoint đó cần được đặc tả riêng; ví dụ trong tài liệu này đang áp dụng cho API lấy QR.
- **Mất mạng khi xem vé (Đặc thù Mobile App)**: Nếu sinh viên không có 4G/Wifi tại địa điểm sự kiện (hội trường sóng yếu), ứng dụng React Native sẽ tự động Fallback lấy dữ liệu vé và mã QR từ bộ nhớ đệm cục bộ (AsyncStorage/SQLite) để hiển thị chế độ Offline.
- **Lấy ảnh QR thất bại**: Nếu không load được ảnh QR từ máy chủ Storage (do lỗi mạng hoặc Storage sập), ứng dụng sẽ tự động sinh mã QR trực tiếp tại Client-side (sử dụng thư viện vẽ Canvas/SVG) dựa trên chuỗi mã định danh dạng text trả về từ Backend.
- **Vé không hợp lệ**: Nếu sinh viên mở một vé đã bị Ban tổ chức hủy hoặc sự kiện đã kết thúc, mã QR sẽ bị làm mờ (dimmed) hoặc bị đóng dấu watermark "Đã hết hạn/Đã hủy" để tránh nhầm lẫn.

## Ràng buộc
- **Bảo mật mã QR**: Dữ liệu nhúng trong QR Code không được là các ID tăng dần dễ đoán. Nó bắt buộc phải là một chuỗi định danh ngẫu nhiên (UUIDv4) hoặc một chuỗi JWT đã được mã hóa/ký (Signed Payload) bằng Secret Key của server để ngăn chặn tình trạng tự tạo mã giả mạo.
- **Cách ly dữ liệu (Data Isolation)**: Tầng Authorization của hệ thống phải bảo đảm sinh viên nào chỉ xem được vé của sinh viên đó, tuyệt đối không có ngoại lệ.
- **Khả dụng Offline (Offline-first)**: Ứng dụng di động bắt buộc phải lưu cache thông tin vé và mã QR của các sự kiện "Sắp diễn ra" để dùng được khi không có kết nối internet.
- **Hiệu năng hiển thị**: Tốc độ load danh sách vé và hiển thị QR phải cực kỳ nhanh (< 1 giây) để không gây ùn tắc tại khu vực check-in.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Giao diện "Vé của tôi" liệt kê đầy đủ danh sách các workshop sinh viên đã đăng ký, phân loại đúng tab/trạng thái (Sắp diễn ra, Lịch sử).
- Khi nhấp vào chi tiết một vé hợp lệ, màn hình phải hiển thị đầy đủ thông tin và một mã QR Code sắc nét.
- Quét thử mã QR bằng ứng dụng quét tiêu chuẩn phải trả ra một chuỗi ký tự được mã hóa/UUID, không phải là ID số nguyên đơn giản.
- Gọi API xem chi tiết vé của một sinh viên khác bằng công cụ (như Postman) phải nhận được lỗi 403 Forbidden.
- Đóng ứng dụng Mobile, ngắt toàn bộ kết nối mạng (bật chế độ máy bay), mở lại ứng dụng và vào mục "Vé của tôi" vẫn phải nhìn thấy và phóng to được mã QR của sự kiện sắp tới.
