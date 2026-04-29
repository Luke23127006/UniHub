| Section | Description |
| :--- | :--- |
| **Use Case Name** | UC03 - Quản Lý Workshop |
| **Initial assumption** | Người dùng đã đăng nhập vào hệ thống ở trang web admin và có quyền hạn thuộc nhóm Ban tổ chức. |
| **Normal** | 1. Ban tổ chức chọn chức năng quản lý danh sách workshop.<br>2. Ban tổ chức thực hiện các thao tác: tạo mới workshop, cập nhật thông tin (đổi phòng, đổi giờ, cập nhật diễn giả) hoặc hủy bỏ một workshop.<br>3. Ban tổ chức nhập/chỉnh sửa các dữ liệu tương ứng.<br>4. Hệ thống kiểm tra tính hợp lệ của dữ liệu (không được trùng phòng, trùng giờ với các workshop khác).<br>5. Hệ thống lưu các thông tin mới vào cơ sở dữ liệu. |
| **What can go wrong** | - Dữ liệu nhập vào vi phạm ràng buộc (trùng lịch, trùng phòng): Hệ thống từ chối lưu và báo lỗi cụ thể để Ban tổ chức sửa lại.<br>- Hủy/Đổi giờ workshop nhưng đã có nhiều sinh viên đăng ký: Hệ thống yêu cầu xác nhận thêm. Nếu có phí, luồng hoàn tiền có thể phải được xử lý thủ công hoặc qua một luồng khác. |
| **Other activities** | Nếu workshop có sự thay đổi quan trọng (hủy, đổi giờ, đổi phòng) mà đã có người đăng ký, hệ thống sẽ kích hoạt tiến trình gửi thông báo qua Email và App tới toàn bộ sinh viên bị ảnh hưởng. |
| **System state on completion** | Dữ liệu về workshop được tạo mới, cập nhật hoặc xóa trong hệ thống cơ sở dữ liệu. Mọi thay đổi này sẽ ngay lập tức được phản ánh ở danh sách hiển thị cho sinh viên ở frontend. |
