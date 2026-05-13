# Frontend URL Detail

Tài liệu này mô tả các URL chính của web UniHub Workshop. Phạm vi được giữ tối giản để tập trung vào các chức năng cốt lõi.

## Quy ước quyền

| Vai trò | Mô tả |
| --- | --- |
| Public | Người chưa đăng nhập. |
| Student | Sinh viên đã đăng nhập. |
| Admin | Ban tổ chức/quản trị viên. |

## Public & Student Pages

| URL | Trang | Nội dung hiển thị | Chức năng chính | Quyền truy cập | Quyền chỉnh sửa |
| --- | --- | --- | --- | --- | --- |
| `/` | Danh sách workshop | Danh sách workshop, thời gian, phòng, diễn giả, số chỗ còn lại, trạng thái, giá Free/Paid. | Xem, tìm kiếm, lọc workshop, mở trang chi tiết. | Public, Student, Admin | Không |
| `/workshops/:id` | Chi tiết workshop | Thông tin đầy đủ của workshop: mô tả, diễn giả, thời gian, phòng, sơ đồ phòng, số chỗ, giá, AI summary nếu có. | Xem chi tiết. Public được điều hướng đăng nhập khi bấm đăng ký; Student mới được đăng ký workshop. | Public, Student, Admin | Không |
| `/login` | Đăng nhập | Form email/mật khẩu hoặc nút SSO, thông báo lỗi đăng nhập. | Đăng nhập và chuyển hướng theo vai trò. | Public | Không |
| `/my-tickets` | Vé của tôi | Danh sách workshop sinh viên đã đăng ký, trạng thái vé, trạng thái thanh toán/check-in. | Xem các vé đã đăng ký. | Student | Không |
| `/my-tickets/:id` | Chi tiết vé | Thông tin vé, workshop liên quan, mã QR check-in, trạng thái vé. | Hiển thị QR để check-in tại sự kiện. | Student sở hữu vé | Không |

## Registration & Payment Pages

| URL | Trang | Nội dung hiển thị | Chức năng chính | Quyền truy cập | Quyền chỉnh sửa |
| --- | --- | --- | --- | --- | --- |
| `/workshops/:id/register` | Xác nhận đăng ký | Thông tin workshop, số chỗ còn lại theo thời gian thực, loại vé Free/Paid, điều kiện đăng ký. | Xác nhận đăng ký workshop, tạo idempotency key và gửi yêu cầu giữ chỗ. | Student | Không |
| `/checkout/:paymentId` | Thanh toán | Thông tin giao dịch, số tiền, thời gian giữ chỗ, trạng thái thanh toán, thông báo khi cổng thanh toán tạm ngưng. | Thực hiện thanh toán mock cho workshop có phí, xử lý retry/timeout mà không tạo giao dịch trùng. | Student sở hữu giao dịch | Không |
| `/payment/success` | Thanh toán thành công | Kết quả thanh toán, thông báo vé/QR đang được tạo hoặc đã sẵn sàng. | Điều hướng về vé của tôi hoặc chi tiết vé sau khi backend xác nhận. | Student | Không |
| `/payment/failure` | Thanh toán thất bại | Lý do thất bại, trạng thái giữ chỗ, hướng dẫn thử lại hoặc quay về workshop. | Xử lý lỗi thanh toán, tránh trừ tiền hai lần khi sinh viên thử lại. | Student | Không |

## Admin Pages

| URL | Trang | Nội dung hiển thị | Chức năng chính | Quyền truy cập | Quyền chỉnh sửa |
| --- | --- | --- | --- | --- | --- |
| `/admin` | Dashboard admin | Tổng số workshop, tổng đăng ký, số chỗ còn lại, doanh thu, tỷ lệ lấp đầy, thời điểm cập nhật thống kê. | Xem thống kê tổng quan từ dữ liệu đã tổng hợp/cache. | Admin | Không |
| `/admin/workshops` | Quản lý workshop | Bảng workshop: tên, thời gian, phòng, trạng thái, số đăng ký, giá, trạng thái AI summary. | Xem danh sách, tìm kiếm, lọc, mở tạo/sửa/hủy workshop. | Admin | Admin |
| `/admin/workshops/new` | Tạo workshop | Form tạo workshop: tên, mô tả, thời gian, phòng, diễn giả, số chỗ, giá, file PDF giới thiệu. | Tạo workshop mới, upload PDF để kích hoạt xử lý AI summary nền. | Admin | Admin |
| `/admin/workshops/:id/edit` | Sửa workshop | Form chỉnh sửa thông tin workshop hiện có, lịch sử/ảnh hưởng thay đổi nếu đã có sinh viên đăng ký. | Cập nhật thông tin, đổi phòng, đổi giờ, upload PDF mới và kích hoạt thông báo khi thay đổi quan trọng. | Admin | Admin |
| `/admin/workshops/:id/cancel` | Hủy workshop | Thông tin workshop, số sinh viên đã đăng ký, giao dịch cần hoàn tiền nếu có, lý do hủy, xác nhận gửi thông báo. | Hủy workshop, chuyển trạng thái vé liên quan và kích hoạt thông báo/hoàn tiền theo luồng backend. | Admin | Admin |
| `/admin/students/import` | Import sinh viên | Form upload CSV thủ công, trạng thái job đồng bộ, số dòng thành công/thất bại, lỗi dữ liệu gần nhất. | Theo dõi hoặc kích hoạt đồng bộ dữ liệu sinh viên từ CSV khi cần kiểm tra/vận hành. | Admin | Admin |

## Error Pages

| URL | Trang | Nội dung hiển thị | Chức năng chính | Quyền truy cập | Quyền chỉnh sửa |
| --- | --- | --- | --- | --- | --- |
| `/403` | Không có quyền | Thông báo người dùng không có quyền truy cập trang. | Chặn truy cập sai vai trò. | Mọi người dùng | Không |
| `*` | Không tìm thấy | Thông báo trang không tồn tại. | Điều hướng về trang phù hợp. | Mọi người dùng | Không |

## Ghi chú phạm vi

- Web không triển khai chức năng quét QR offline; chức năng đó thuộc mobile app.
- Staff check-in không có dashboard web riêng trong phạm vi tối giản.
- Không có trang đăng ký tài khoản riêng. Sinh viên đăng nhập bằng tài khoản cấp sẵn hoặc SSO; dữ liệu hợp lệ được đối chiếu với danh sách sinh viên đồng bộ từ CSV.
- Thông báo xác nhận/hủy/đổi lịch được xử lý qua email/app notification bởi backend worker, không cần trang thông báo web riêng trong phạm vi tối giản.
- Backend vẫn phải kiểm tra quyền bằng RBAC/JWT. Frontend chỉ hỗ trợ điều hướng và ẩn các thao tác không phù hợp.
