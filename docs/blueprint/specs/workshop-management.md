# Đặc tả: Quản lý Workshop (CRUD)

## Mô tả
Tính năng "Quản lý Workshop" (UC03) cung cấp giao diện Dashboard nội bộ (Web) dành riêng cho Ban tổ chức (Admin) để thực hiện các thao tác thao tác vòng đời dữ liệu (Tạo mới, Đọc, Cập nhật, Xóa/Hủy) đối với các sự kiện. Tính năng này đóng vai trò quyết định dữ liệu hiển thị trên ứng dụng của sinh viên. Do tác động trực tiếp đến dữ liệu lõi, chức năng này yêu cầu các ràng buộc khắt khe về nghiệp vụ (như chống trùng lịch, trùng phòng), cơ chế tự động dọn dẹp bộ nhớ đệm (Cache Invalidation) và tự động gửi thông báo (Notification) để xử lý khủng hoảng truyền thông khi có thay đổi quan trọng.

## Luồng chính
1. Ban tổ chức (Admin) truy cập trang Web Dashboard nội bộ và đăng nhập bằng tài khoản quản trị.
2. Admin điều hướng đến trang "Quản lý sự kiện" và chọn thực hiện thao tác: Tạo mới sự kiện, hoặc Chỉnh sửa một sự kiện đang có.
3. Admin điền các thông tin mô tả sự kiện: Tên, Mô tả, Thời gian bắt đầu/kết thúc, Diễn giả, Số lượng ghế tối đa, Giá vé (nếu có).
4. Admin tải lên các tệp đính kèm (File PDF giới thiệu, Ảnh minh họa, Ảnh sơ đồ phòng). Client gọi API Upload (`POST /v1/upload`) để đẩy file thẳng lên Cloud Storage (ví dụ: AWS S3) và nhận lại URL.
5. Client gửi toàn bộ Payload (bao gồm cả các URL file vừa nhận) lên Backend (Node.js) qua API `POST /v1/workshops` để tạo mới, hoặc `PUT /v1/workshops/:id` để cập nhật workshop hiện có.
6. Backend tiếp nhận và thực hiện Validation nghiệp vụ:
   - Kiểm tra ràng buộc không gian và thời gian để đảm bảo không có hai sự kiện nào diễn ra cùng một phòng trong cùng một khung giờ.
7. Nếu dữ liệu hợp lệ, Backend lưu thông tin vào cơ sở dữ liệu PostgreSQL.
8. Backend thực thi **Cache Invalidation** bằng cách xóa bỏ (hoặc cập nhật) các key lưu trữ danh sách workshop trên Redis, đảm bảo sinh viên thao tác trên App sẽ thấy ngay dữ liệu mới nhất.
9. Nếu đây là thao tác "Cập nhật" có thay đổi Giờ giấc, Địa điểm, hoặc là thao tác "Hủy/Đóng băng" sự kiện ĐÃ có người đăng ký, Backend sẽ đẩy một Message Event (VD: `workshop.updated.event`) vào RabbitMQ.
10. Các Worker chạy ngầm sẽ tiêu thụ (Consume) Message này và kích hoạt dịch vụ Thông báo (UC08) để gửi email/push notification đến toàn bộ danh sách sinh viên bị ảnh hưởng.
11. Trả về phản hồi thành công và giao diện Dashboard cập nhật lại danh sách hiển thị.

## Kịch bản lỗi
- **Trùng lặp thời gian/địa điểm (Conflict)**: Nếu phát hiện phòng đã được đặt cho một sự kiện khác trong cùng khung giờ, Backend từ chối ghi nhận và trả về lỗi HTTP 409 Conflict kèm mô tả chi tiết (ví dụ: "Phòng Hội trường A đã có sự kiện từ 08:00 - 11:00").
- **Hủy sự kiện đã có người đăng ký**: Khi Admin bấm "Hủy sự kiện" hoặc giảm số lượng vé tối đa xuống thấp hơn số vé đã lỡ bán, Backend sẽ cảnh báo lỗi (HTTP 400). Giao diện yêu cầu Admin phải điền lý do hủy và bắt buộc đánh dấu vào ô "Xác nhận gửi email thông báo và chấp nhận hoàn tiền (nếu có)" thì mới được phép gọi API Force Cancel.
- **Lỗi Upload File**: Nếu hệ thống Cloud Storage bảo trì hoặc file upload quá dung lượng cho phép (> 5MB), API trả về lỗi HTTP 413 Payload Too Large. Frontend hiển thị thông báo lỗi và yêu cầu nén file/chọn lại.
- **Mất quyền Quản trị (Unauthorized)**: Nếu phiên làm việc của Admin hết hạn, API trả về 401 Unauthorized và lập tức đẩy người dùng về trang đăng nhập.

## Ràng buộc
- **Bảo mật & Phân quyền**: Mọi API thuộc nhóm quản trị (`POST/PUT/DELETE /api/v1/workshops`) bắt buộc phải đi qua Middleware xác thực. Chỉ Token mang Role `Admin` mới được phép thao tác.
- **Tính nhất quán của Cache (Cache Consistency)**: Mọi sự thay đổi (Thêm/Sửa/Xóa) tác động đến dữ liệu sự kiện bắt buộc phải có cơ chế đồng bộ làm mới bộ nhớ đệm (Redis Cache), tránh tình trạng sinh viên truy cập vào một sự kiện đã bị hủy.
- **Xử lý File**: Tất cả tài liệu đa phương tiện tải lên phải được lưu trữ trên một dịch vụ Object Storage riêng biệt, tuyệt đối không lưu trực tiếp vào ổ cứng của Server Node.js để dễ dàng mở rộng hạ tầng (Scale out).
- **Quy trình Bất đồng bộ (Asynchronous)**: Việc gửi hàng trăm/ngàn email thông báo khi hủy sự kiện bắt buộc phải dùng hàng đợi (RabbitMQ) xử lý trong Background để không làm treo (block) request của Admin trên giao diện.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Admin tạo mới thành công một workshop với đầy đủ thông tin chữ và file, dữ liệu sự kiện đó ngay lập tức xuất hiện trên giao diện Ứng dụng Sinh viên.
- Hệ thống báo lỗi ngay lập tức (HTTP 409) nếu Admin cố gắng tạo hoặc dời một workshop sang một phòng họp đang bị chiếm dụng trong cùng khoảng thời gian đó.
- Cập nhật số ghế trống tối đa (Max Seats) của một sự kiện không được phép thiết lập giá trị nhỏ hơn tổng số vé (Tickets) thực tế đã được sinh viên giữ chỗ/mua.
- Bất kỳ thay đổi nào về Địa điểm và Thời gian đối với một sự kiện đang có người đăng ký đều phải kích hoạt thành công tiến trình gửi email tự động đính kèm lý do thay đổi.
- Bắn request bằng công cụ ngoài (Postman) với Token của `Student` hoặc `Staff` vào các Endpoint tạo/sửa workshop phải nhận được mã lỗi 403 Forbidden.
