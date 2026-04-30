# Đặc tả: Cập nhật chỗ trống Real-time

## Mô tả
Tính năng "Cập nhật chỗ trống Real-time" thuộc phạm vi UC01, đóng vai trò cung cấp thông tin số lượng ghế còn trống của các sự kiện một cách liên tục và tức thời (real-time) đến toàn bộ sinh viên đang xem ứng dụng. Mục tiêu cốt lõi là giúp sinh viên nắm bắt được tình trạng "cháy vé" trong các sự kiện hot (có thể lên tới 12.000 người truy cập đồng thời) mà không cần thao tác tải lại trang (reload). Tính năng tận dụng sức mạnh của Redis và kết nối WebSocket/Server-Sent Events (SSE) để tối ưu hóa hiệu suất truyền tải.

## Luồng chính
1. Khi sinh viên truy cập vào màn hình "Danh sách Workshop" hoặc "Chi tiết Workshop", Client (Web/Mobile App) khởi tạo một kết nối thời gian thực (như WebSocket hoặc SSE) tới Backend (Node.js).
2. Client gửi tín hiệu yêu cầu theo dõi (subscribe) sự thay đổi số lượng ghế của các workshop đang hiển thị trên màn hình.
3. Bất cứ khi nào có một sinh viên khác thực hiện thành công thao tác "Giữ chỗ/Đăng ký", Backend sẽ cập nhật số lượng ghế trống ngay lập tức trong bộ nhớ đệm Redis.
4. Thông qua cơ chế Redis Pub/Sub, Backend phát (broadcast) sự kiện `seat_updated` (gồm `workshop_id` và số `available_seats` mới) tới tất cả các Client đang theo dõi (subscribe) workshop đó.
5. Client nhận được thông điệp, tự động cập nhật con số hiển thị trên giao diện (ví dụ: nhảy số từ 50 xuống 49) kèm theo hiệu ứng UI nhẹ để thông báo sự thay đổi.
6. Khi sinh viên rời khỏi màn hình, Client sẽ chủ động ngắt kết nối hoặc hủy theo dõi (unsubscribe) để giải phóng tài nguyên máy chủ.

## Kịch bản lỗi
- **Mất kết nối mạng (Client-side)**: Nếu thiết bị của sinh viên rớt mạng, kết nối WebSocket/SSE bị ngắt. Client tự động hiển thị biểu tượng "Đang kết nối lại..." và áp dụng chiến lược thử lại (Exponential Backoff). Khi có mạng, Client sẽ gọi API REST để lấy số ghế mới nhất trước khi tiếp tục nhận luồng sự kiện real-time.
- **Backend/Hạ tầng quá tải**: Khi lượng truy cập quá khủng (vượt quá 12.000 CCU) làm luồng đẩy tin nhắn real-time bị nghẽn hoặc rớt, Client sẽ tự động Fallback sang cơ chế Short-Polling (tự động gọi API mỗi 10 giây) để đảm bảo sinh viên vẫn thấy được sự thay đổi số ghế.
- **Bất đồng bộ dữ liệu (Data Inconsistency)**: Số ghế hiển thị trên Redis có thể tạm thời bị sai lệch so với số vé chốt trong PostgreSQL. Hệ thống sử dụng một Background Worker để định kỳ đồng bộ (Self-healing) dữ liệu từ DB lên Redis nhằm sửa lỗi sai lệch.

## Ràng buộc
- **Khả năng mở rộng (Scalability)**: Kiến trúc phải duy trì được đồng thời lên đến 12.000 kết nối mở (connections) liên tục. Yêu cầu sử dụng cluster/cơ chế phân tán kết nối (ví dụ qua Redis Pub/Sub kết hợp với nhiều Node.js instances).
- **Độ trễ (Latency)**: Thời gian từ lúc ghế bị trừ trong Redis đến khi số ghế mới hiển thị trên thiết bị của các sinh viên khác không được vượt quá 1 giây (Eventual Consistency với độ trễ thấp).
- **Tối ưu băng thông**: Hệ thống chỉ đẩy dữ liệu khi thực sự có sự thay đổi (Diff), và Client chỉ subscribe cập nhật cho các workshop đang xuất hiện trong tầm nhìn (Viewport) của màn hình.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Giao diện thiết bị A phải tự động giảm số chỗ trống khi thiết bị B giữ chỗ thành công mà không yêu cầu thiết bị A tải lại trang (reload).
- Ứng dụng xử lý đúng trường hợp mất mạng: Hiển thị thông báo, tự kết nối lại và đồng bộ đúng số ghế hiện tại sau khi có mạng trở lại.
- Hệ thống hỗ trợ cơ chế Fallback mượt mà: Tự chuyển đổi sang Polling nếu kết nối WebSocket/SSE bị chặn bởi Firewall/Proxy của môi trường mạng sinh viên.
- Đảm bảo Backend Node.js không bị treo hoặc tràn bộ nhớ (Out Of Memory) khi phải xử lý và đẩy sự kiện cho 12.000 kết nối đồng thời.
