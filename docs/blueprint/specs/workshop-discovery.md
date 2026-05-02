# Đặc tả: Khám phá Workshop (UC01)

## Mô tả
Tính năng "Khám phá Workshop" cho phép sinh viên xem lịch và danh sách các sự kiện (workshop) đang được tổ chức trên hệ thống UniHub. Hệ thống cung cấp thông tin tổng quan, sau đó cho phép xem chi tiết bao gồm diễn giả, sơ đồ phòng, số chỗ trống theo thời gian thực (real-time) và bản tóm tắt nội dung sự kiện do AI tạo ra. Tính năng này được thiết kế với cơ chế chịu tải cao, đảm bảo hoạt động mượt mà ngay cả khi có lượng lớn người dùng (ví dụ: 12.000 sinh viên) truy cập cùng lúc để "săn" vé.

## Luồng chính
1. Sinh viên truy cập vào ứng dụng (Web hoặc React Native App) và chuyển đến màn hình "Danh sách Workshop".
2. Client gửi request (GET `/v1/workshops`) lên Backend (Node.js) để lấy danh sách sự kiện.
3. Backend ưu tiên kiểm tra bộ nhớ đệm (Redis Cache). Nếu có dữ liệu hợp lệ, trả về ngay lập tức; nếu chưa có, truy vấn PostgreSQL, lưu vào Redis và trả về cho Client.
4. Client hiển thị danh sách workshop với các thông tin cơ bản: Tên sự kiện, thời gian, diễn giả, phòng tổ chức.
5. Client thiết lập cơ chế cập nhật liên tục (như SSE, WebSocket hoặc Short Polling) để hiển thị số lượng chỗ trống còn lại theo thời gian thực (real-time).
6. Sinh viên sử dụng thanh tìm kiếm hoặc bộ lọc để thu hẹp kết quả (theo chủ đề, diễn giả, trạng thái còn chỗ).
7. Sinh viên nhấp vào một workshop cụ thể để xem chi tiết.
8. Client gọi API lấy chi tiết workshop (bao gồm sơ đồ phòng và bản tóm tắt AI) và hiển thị giao diện chi tiết.

## Kịch bản lỗi
- **Quá tải hệ thống (Lưu lượng đột biến)**: Khi lượng sinh viên truy cập đồng loạt gây quá tải, hệ thống áp dụng cơ chế Graceful Degradation. Backend ưu tiên trả về danh sách workshop tĩnh từ Redis Cache. Các tính năng nặng (tóm tắt AI) có thể bị tạm ngưng và hiển thị thông báo "Hệ thống đang quá tải, một số tính năng đang tạm khóa".
- **Lỗi Rate Limit (HTTP 429 Too Many Requests)**: Nếu người dùng gửi quá nhiều request (spam/F5 liên tục), API sẽ chặn và trả về lỗi 429. Frontend phải bắt lỗi này, không hiển thị màn hình trắng (crash) mà duy trì hiển thị danh sách từ bộ nhớ đệm (trình duyệt/app cache), đồng thời tạm ngưng tính năng cập nhật số ghế real-time.
- **Mất kết nối Database**: Nếu kết nối giữa Node.js và PostgreSQL bị gián đoạn, hệ thống chỉ trả về dữ liệu đang được cache trên Redis kèm thông báo "Dữ liệu đang được đồng bộ" và có thể tạm vô hiệu hóa nút Đăng ký.
- **Lỗi kết nối thời gian thực**: Nếu kết nối real-time bị rớt (mạng yếu), Client tự động thử kết nối lại ngầm (reconnect) và tạm thời hiển thị số ghế của lần cập nhật thành công cuối cùng.

## Ràng buộc
- **Hiệu năng và Caching**: Thời gian tải danh sách workshop (P95) không vượt quá 500ms. Bắt buộc sử dụng Redis để cache dữ liệu danh sách (TTL phù hợp) thay vì truy vấn trực tiếp DB cho mỗi request.
- **Tính khả dụng**: Hệ thống phải chịu được mức tải truy cập đồng thời lên đến 12.000 CCU.
- **Bảo vệ API (Rate Limiting)**: Phải cấu hình Rate Limiting trên Gateway/Backend (sử dụng Redis) để giới hạn số lượng request từ mỗi IP/User.
- **Tính nhất quán**: Số lượng ghế hiển thị real-time cho phép có độ trễ nhỏ (Eventual Consistency) nhưng phải bám sát tình trạng đăng ký thực tế.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Hệ thống hiển thị chính xác danh sách các workshop đang mở (Tên, Diễn giả, Phòng, Thời gian) trên cả nền tảng Web và Mobile App.
- Chức năng tìm kiếm và lọc hoạt động đúng, trả về kết quả khớp với tiêu chí của người dùng.
- Giao diện xem chi tiết hiển thị đầy đủ thông tin mô tả, sơ đồ phòng tổ chức và đoạn tóm tắt nội dung AI (nếu có).
- Số lượng ghế trống (Available Seats) tự động cập nhật trên giao diện theo thời gian thực mà không yêu cầu người dùng phải chủ động tải lại trang.
- Khi hệ thống bị quá tải hoặc DB lỗi, giao diện không bị gián đoạn hoàn toàn (trắng trang) mà chuyển sang hiển thị dữ liệu từ cache cục bộ/Redis kèm thông báo thân thiện.
- Cơ chế Rate Limit chặn thành công các request vượt ngưỡng (trả lỗi 429), và Frontend xử lý mượt mà lỗi này mà không làm treo ứng dụng.
