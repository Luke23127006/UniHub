# Đặc tả Phân quyền (RBAC) và Bảo mật hệ thống UniHub Workshop

Tài liệu này mô tả chi tiết cơ chế Kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC) và luồng xác thực cho hệ thống UniHub Workshop.

## 1. Danh sách Vai trò (Roles)

Hệ thống xoay quanh 3 vai trò (Role) cốt lõi, mỗi vai trò có một phạm vi quyền hạn (Permissions) được cách ly nghiêm ngặt:

### Student (Sinh viên):

Là người dùng cuối trên Web App.

Quyền hạn: Xem danh sách workshop đang mở, xem chi tiết, đăng ký/mua vé, xem lịch sử vé đã mua, và lấy mã QR để đi check-in.

Giới hạn: Chỉ được phép xem và thao tác trên dữ liệu (vé, thông báo) của chính mình.

### Staff (Nhân sự Check-in):

Là người dùng trên Mobile App (Offline-first).

Quyền hạn: Đăng nhập vào App, chọn workshop được phân công, dùng camera quét mã QR của sinh viên để ghi nhận trạng thái tham gia, xem thống kê số lượng check-in tại thời điểm thực tế.

Giới hạn: Không có quyền tạo/sửa workshop hay xem thông tin nhạy cảm của sinh viên ngoài phạm vi check-in.

### Admin (Ban tổ chức):

Là quản trị viên trên Web App (Trang Dashboard nội bộ).

Quyền hạn: Toàn quyền quản lý hệ thống. Bao gồm CRUD (Tạo, Đọc, Cập nhật, Xóa) workshop, quản lý danh sách staff, xem toàn bộ giao dịch, hủy vé, và import dữ liệu sinh viên từ file CSV.

## 2. Cấu trúc Token (JSON Web Token - JWT)

Hệ thống sử dụng cơ chế Bearer Token (JWT) để xác thực (Authentication) người dùng. Khi login thành công, server trả về một accessToken (thời gian sống ngắn, ví dụ 15 phút) và một refreshToken (thời gian sống dài, ví dụ 7 ngày).

### Payload của Access Token:

Bắt buộc phải chứa thông tin định danh và vai trò để giảm thiểu số lượng truy vấn xuống Database ở các request sau.

```json
{
  "sub": "user_12345",         // Mã ID định danh của người dùng
  "email": "studentA@uni.edu", // Email
  "role": "Student",           // Vai trò (Student, Staff, Admin)
  "iat": 1716300000,           // Thời điểm tạo token
  "exp": 1716303600            // Thời điểm hết hạn token
}
```

## 3. Đặc tả Bảo vệ Endpoint (Security Specification)

Mọi request từ Client gọi lên các API yêu cầu quyền hạn đều phải đi qua 3 tầng kiểm duyệt (Middleware) trên Backend.

### Tầng 1: Xác thực Token (Authentication Middleware)

Nhiệm vụ: Kiểm tra xem request có phải từ một người dùng hợp lệ trong hệ thống hay không.

Quy trình:

- Bóc tách Header Authorization. Nếu không có hoặc không bắt đầu bằng chữ Bearer , trả về lỗi 401 Unauthorized.
- Lấy chuỗi token và dùng Secret Key để verify chữ ký (Signature). Nếu chữ ký sai hoặc token đã bị sửa đổi, trả về 401 Unauthorized.
- Kiểm tra trường exp. Nếu token đã hết hạn, trả về 401 Unauthorized kèm thông báo báo client dùng Refresh Token để xin cấp lại Access Token mới.
- Nếu hợp lệ, gán payload của token vào object Request (ví dụ: req.user = decodedPayload) và cho phép đi qua tầng 2.

### Tầng 2: Phân quyền (Authorization Middleware)

Nhiệm vụ: Kiểm tra xem người dùng (đã xác thực ở Tầng 1) có được phép gọi API này không.

Quy trình:

- Middleware nhận vào một mảng các roles được phép truy cập (Ví dụ: requireRoles(['Admin', 'Staff'])).
- Đọc req.user.role (từ Tầng 1 truyền sang).
- Nếu role của người dùng nằm trong danh sách cho phép, cho phép đi tiếp vào Controller để xử lý logic.
- Nếu không có trong danh sách, trả về lỗi 403 Forbidden (Biết bạn là ai, nhưng bạn không có quyền vào đây).

### Tầng 3: Phân quyền theo Chủ sở hữu (Data Segregation - Dành riêng cho Student)

Ngay cả khi Student gọi API có quyền Student (ví dụ: GET /api/v1/tickets/:id), hệ thống phải kiểm tra thêm req.user.sub == ticket.ownerId.

Nếu không trùng khớp, đánh chặn và trả về 403 Forbidden hoặc 404 Not Found để chống lỗi IDOR (Insecure Direct Object Reference - Sinh viên này lấy vé của sinh viên khác).

## 4. Ma trận Phân quyền API (API Access Matrix)

Dưới đây là bảng đặc tả quy định Role nào được gọi Endpoint nào. Các Endpoint không có trong bảng này được xem là Public (Ai cũng gọi được, ví dụ: Login, Xem danh sách workshop đang mở).

| Endpoint                          | Method     | Chức năng                           | Role được phép |
| --------------------------------- | ---------- | ----------------------------------- | -------------- |
| /api/v1/workshops                 | GET        | Xem danh sách workshop              | Public         |
| /api/v1/workshops                 | POST       | Tạo workshop mới                    | Admin          |
| /api/v1/workshops/:id             | GET        | Xem chi tiết + AI Summary           | Public         |
| /api/v1/workshops/:id             | PUT/DELETE | Sửa/Hủy workshop                    | Admin          |
| /api/v1/workshops/:id/pdf-summary | POST       | Tóm tắt file PDF bằng AI            | Admin          |
| /api/v1/students/import           | POST       | Import CSV dữ liệu sinh viên        | Admin          |
| /api/v1/tickets/register          | POST       | Đăng ký / Giữ chỗ (Mua vé)          | Student        |
| /api/v1/tickets/my-tickets        | GET        | Xem danh sách vé của tôi            | Student        |
| /api/v1/tickets/:id/qr            | GET        | Lấy mã QR check-in                  | Student        |
| /api/v1/checkin/scan              | POST       | Quét QR ghi nhận check-in           | Staff          |
| /api/v1/checkin/sync              | POST       | Đồng bộ dữ liệu check-in offline    | Staff          |
| /api/v1/workshops/:id/stats       | GET        | Xem thống kê số lượng vé / check-in | Admin, Staff   |
