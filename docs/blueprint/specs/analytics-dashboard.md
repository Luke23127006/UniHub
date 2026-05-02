# Đặc tả: Dashboard Thống kê (UC04)

## Mô tả
Tính năng "Dashboard Thống kê" là trung tâm báo cáo trên nền tảng Web Admin dành cho Ban tổ chức (Role: Admin). Tính năng này cung cấp một cái nhìn toàn cảnh và trực quan về hiệu quả của sự kiện thông qua các chỉ số: tổng số lượng đăng ký, tỷ lệ lấp đầy phòng họp, và tổng doanh thu thu được từ các workshop có phí. Để giải quyết bài toán hiệu năng khi phải truy xuất và tính toán trên một tập dữ liệu khổng lồ (hàng chục ngàn lượt đăng ký, check-in và thanh toán), hệ thống áp dụng cơ chế tổng hợp dữ liệu sẵn (Pre-aggregation) thông qua Materialized Views trong Database kết hợp với Redis Cache, thay vì truy vấn trực tiếp (Live Query) gây nghẽn máy chủ.

## Luồng chính
1. Admin đăng nhập thành công vào hệ thống Web Admin và truy cập vào menu "Dashboard".
2. Client (Web) gửi API Request (`GET /v1/analytics/overview`) để lấy dữ liệu tổng hợp.
3. Backend (Node.js) nhận request và ưu tiên đọc dữ liệu báo cáo đã được tính toán sẵn từ bộ nhớ đệm (Redis Cache).
4. Nếu dữ liệu trong Redis không có (Cache Miss), Backend truy xuất dữ liệu từ các Materialized Views của PostgreSQL (các view này đã được group và sum sẵn số liệu).
5. Backend trả về dữ liệu định dạng JSON bao gồm: chuỗi thời gian (time-series) cho biểu đồ và con số tổng (metrics) cho các thẻ (Cards).
6. Client sử dụng các thư viện vẽ biểu đồ (ví dụ: Chart.js, Recharts) để render đồ thị đường (số lượng đăng ký biến động theo ngày) và biểu đồ tròn (tỷ lệ lấp đầy).
7. Admin có thể sử dụng bộ lọc (Filter) để xem thống kê theo: Toàn bộ sự kiện, Khung thời gian cụ thể, hoặc theo một Workshop cụ thể. Client gọi API tương ứng kèm tham số lọc và cập nhật lại biểu đồ.

## Kịch bản lỗi
- **Truy vấn quá tải (Database Timeout)**: Nếu bộ nhớ đệm sập và hệ thống rơi vào tình thế phải quét toàn bộ các bảng gốc (Table Scan) trên hàng triệu bản ghi, Backend sẽ thiết lập cơ chế ngắt truy vấn (Timeout) sau 5 giây để bảo vệ PostgreSQL. API trả về lỗi HTTP 503 Service Unavailable kèm thông báo trên UI: "Dữ liệu đang được tổng hợp, vui lòng thử lại sau ít phút".
- **Tiến trình đồng bộ lỗi (Stale Data)**: Nếu Background Worker cập nhật Materialized View bị chết, số liệu trên Dashboard sẽ không nhảy số mới. Hệ thống Client sẽ hiển thị một dòng cảnh báo nhỏ màu vàng (dựa trên timestamp cập nhật cuối cùng trả về từ API): "Dữ liệu được cập nhật lần cuối vào X giờ trước".
- **Không có quyền truy cập (Unauthorized)**: Một người dùng có tài khoản hợp lệ nhưng mang Role `Staff` (Nhân sự check-in) hoặc `Student` cố ý truy cập API thống kê. Hệ thống lập tức chặn và trả về lỗi HTTP 403 Forbidden.

## Ràng buộc
- **Hiệu năng Truy xuất (Read Performance)**: API trả về dữ liệu Dashboard không được vượt quá 1 giây để đảm bảo trải nghiệm quản trị mượt mà. Nghiêm cấm (Anti-pattern) việc sử dụng lệnh `SELECT COUNT(*)` kết hợp hàng loạt lệnh `JOIN` phức tạp trực tiếp trên các bảng `Tickets` và `Payments` mỗi khi có request từ Client.
- **Tính nhất quán cuối (Eventual Consistency)**: Dữ liệu trên Dashboard được phép có độ trễ (Delay) so với thực tế đang diễn ra ở cổng đăng ký. Hệ thống chấp nhận độ trễ từ 5 đến 15 phút.
- **Tiến trình ngầm định kỳ (Background Jobs)**: Phải cấu hình các Cron Jobs hoặc Background Workers chạy định kỳ (ví dụ mỗi 10 phút) để gọi lệnh `REFRESH MATERIALIZED VIEW CONCURRENTLY` trên PostgreSQL và nạp kết quả mới vào Redis.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Màn hình Dashboard hiển thị rõ nét và đầy đủ 4 nhóm chỉ số chính: Tổng số đăng ký, Số chỗ còn trống, Tỷ lệ lấp đầy (%), và Tổng doanh thu (VNĐ).
- Thời gian tải hoàn tất toàn bộ các biểu đồ và con số trên trang Dashboard khi mới truy cập phải cực ngắn (dưới 1 giây).
- Chức năng lọc theo thời gian (Từ ngày - Đến ngày) và lọc theo từng Workshop hoạt động chính xác, dữ liệu trên các biểu đồ thay đổi tương ứng.
- Khi giả lập chèn thêm 50.000 bản ghi đăng ký mới vào PostgreSQL, giao diện Dashboard vẫn phải load nhanh (< 1 giây) nhờ khả năng truy xuất từ View/Cache thay vì query trực tiếp.
- Giao diện có hiển thị nhãn thời gian "Cập nhật lần cuối: [Thời gian]" (Ví dụ: Cập nhật lần cuối lúc 10:05 AM) để Admin nắm bắt được độ trễ của số liệu.
