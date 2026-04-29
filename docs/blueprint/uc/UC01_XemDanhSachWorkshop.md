| Section | Description |
| :--- | :--- |
| **Use Case Name** | UC01 - Xem Danh Sách Workshop |
| **Initial assumption** | Sinh viên đã truy cập vào ứng dụng/trang web của hệ thống UniHub Workshop. |
| **Normal** | 1. Sinh viên chọn chức năng xem lịch/danh sách workshop.<br>2. Hệ thống hiển thị danh sách các workshop, bao gồm: thông tin diễn giả, phòng tổ chức, sơ đồ phòng, số chỗ còn lại theo thời gian thực.<br>3. Sinh viên chọn xem chi tiết một workshop cụ thể (bao gồm cả bản tóm tắt do AI tạo ra nếu có). |
| **What can go wrong** | - Lượng truy cập quá cao (VD: 12.000 sinh viên truy cập cùng lúc): Hệ thống quá tải, không thể tải được danh sách. Hệ thống cần phản hồi bằng dữ liệu cache (Graceful Degradation) hoặc hiển thị màn hình chờ thay vì sập toàn bộ.<br>- Không kết nối được đến database để lấy số chỗ trống theo thời gian thực. |
| **Other activities** | - Hệ thống liên tục cập nhật số chỗ còn lại theo thời gian thực (real-time) dựa trên số lượng sinh viên đang đăng ký.<br>- Các cơ chế Rate Limiting hoạt động ngầm để bảo vệ API khỏi các request ồ ạt. |
| **System state on completion** | Trạng thái hệ thống không thay đổi; sinh viên xem được danh sách workshop và có thể tiếp tục tiến hành đăng ký. |
