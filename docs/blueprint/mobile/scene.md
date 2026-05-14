# Mobile App Scenes (Staff Only)

Tài liệu này đặc tả các màn hình (scenes) của ứng dụng Mobile, tập trung vào nghiệp vụ check-in offline cho Staff.

## 1. Login Scene
- **Mục đích**: Xác thực nhân sự và cấp quyền truy cập.
- **Hiển thị**: Form Username/Password, Logo dự án.
- **Quyền truy cập**: Public.
- **Kỹ thuật quan trọng**: 
    - **JWT**: Lưu Access/Refresh Token vào `SecureStore`.
    - **RBAC**: Chỉ cho phép người dùng có role `STAFF` hoặc `ADMIN` đăng nhập thành công vào App.

## 2. Dashboard / Workshop Selection
- **Mục đích**: Chọn workshop cụ thể để bắt đầu ca trực check-in.
- **Hiển thị**: Danh sách workshop đang diễn ra (Tên, Phòng, Thời gian, Số lượng check-in thực tế).
- **Quyền truy cập**: Staff, Admin.
- **Kỹ thuật quan trọng**: 
    - **Caching**: Lưu danh sách workshop vào bộ nhớ đệm để có thể chọn ngay cả khi mạng yếu lúc bắt đầu ca.

## 3. QR Scanner (Core Scene)
- **Mục đích**: Quét mã QR của sinh viên để xác nhận tham dự.
- **Hiển thị**: Camera view, Bounding box (khung ngắm), Phản hồi trạng thái (Thành công/Thất bại/Vé giả).
- **Quyền truy cập**: Staff, Admin.
- **Kỹ thuật quan trọng**: 
    - **Offline JWT Validation**: Giải mã QR (dạng signed token) để kiểm tra tính hợp lệ mà không cần gọi API.
    - **Local Storage (SQLite)**: Lưu tạm dữ liệu check-in khi offline.
    - **Haptics**: Rung thiết bị để phản hồi kết quả tức thì.

## 4. Sync Status & History
- **Mục đích**: Quản lý các bản ghi check-in offline và theo dõi tiến độ đồng bộ.
- **Hiển thị**: Danh sách sinh viên đã check-in thành công, trạng thái "Đã đồng bộ" hoặc "Đang chờ".
- **Quyền truy cập**: Staff, Admin.
- **Kỹ thuật quan trọng**: 
    - **Idempotency**: Gửi `Idempotency-Key` kèm mỗi bản ghi khi đồng bộ lại để tránh tính trùng dữ liệu trên Server nếu network retry.
    - **Batch Sync**: Gộp nhiều bản ghi thành 1 mảng để giảm số lượng Request.
    - **NetInfo**: Tự động kích hoạt đồng bộ khi phát hiện thiết bị có mạng trở lại.
