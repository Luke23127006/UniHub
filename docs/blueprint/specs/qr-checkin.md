# Đặc tả: Quét mã QR (UC06)

## Mô tả
Tính năng "Quét mã QR" là công cụ vận hành cốt lõi dành riêng cho Nhân sự sự kiện (Role: Staff) sử dụng trên nền tảng ứng dụng di động (React Native App). Tính năng này cho phép Staff sử dụng camera của điện thoại để quét mã QR vé của sinh viên, giải mã và ghi nhận trạng thái điểm danh (check-in) một cách nhanh chóng. Để đối phó với tình trạng hội trường đông đúc và sóng di động/Wifi kém, tính năng được thiết kế theo kiến trúc **Offline-First**, giúp Staff kiểm duyệt vé mượt mà ngay cả khi mất kết nối mạng hoàn toàn, và tự động đồng bộ (Auto-sync) lịch sử khi mạng ổn định trở lại.

## Luồng chính
1. **Đồng bộ trước giờ G (Pre-fetch)**: Trước khi sự kiện bắt đầu (lúc còn mạng), Staff mở App, chọn sự kiện được phân công và ấn nút "Đồng bộ dữ liệu". App gọi API tải toàn bộ danh sách vé hợp lệ của sự kiện đó (`ticket_id`, `student_id`, `status`) và lưu vào CSDL cục bộ trên điện thoại (Local DB như SQLite hoặc WatermelonDB).
2. **Quá trình Quét (Scanning)**: Tại cửa check-in, Staff mở màn hình quét QR. Sinh viên xuất trình mã QR trên điện thoại cá nhân.
3. **Giải mã & Đối chiếu (Validation)**:
   - App đọc chuỗi dữ liệu nhúng trong QR Code (thường là một Signed JWT hoặc UUID).
   - App đối chiếu mã này với danh sách vé đã lưu sẵn trong Local DB.
4. **Ghi nhận Check-in (Offline)**:
   - Nếu mã hợp lệ và vé chưa được quét, App lập tức cập nhật trạng thái vé thành "Đã check-in" trong Local DB. Màn hình nháy sáng màu xanh lá cây kèm hiệu ứng âm thanh "Tít" thành công.
   - App đưa sự kiện check-in này vào một hàng đợi đồng bộ (Sync Queue) nội bộ.
5. **Đồng bộ tự động (Auto-sync)**: Một tiến trình chạy ngầm (Background Task) trong App liên tục lắng nghe trạng thái kết nối mạng (NetInfo). Ngay khi phát hiện có Internet, App sẽ đóng gói toàn bộ danh sách trong Sync Queue thành một mảng (batch) và gọi API `POST /api/v1/checkin/sync` đẩy lên Backend (Node.js) để chốt dữ liệu vào PostgreSQL, sau đó dọn dẹp hàng đợi.

## Kịch bản lỗi
- **Vé giả mạo / Không tồn tại**: Nếu giải mã QR ra một ID vé không nằm trong danh sách sự kiện hiện tại của Local DB (hoặc sai chữ ký mã hóa), App lập tức hiển thị màn hình đỏ kèm âm thanh bíp cảnh báo (Lỗi vé không hợp lệ/Sai sự kiện).
- **Vé quét trùng (Double Scan)**: Nếu một mã QR bị cố tình chụp màn hình gửi cho người khác quét lần 2, App tra cứu Local DB thấy trạng thái đã là "Đã check-in", sẽ hiển thị màn hình đỏ cảnh báo "Vé này đã được sử dụng vào lúc [hh:mm]".
- **Quên đồng bộ trước sự kiện**: Nếu Staff đi thẳng đến vùng mất sóng, mở App nhưng trong Local DB trống rỗng, App sẽ khóa màn hình quét và hiển thị thông báo "Dữ liệu trống. Vui lòng tìm vùng có mạng để đồng bộ danh sách vé trước khi bắt đầu".
- **Xung đột dữ liệu khi Sync (Conflict)**: Nếu hai Staff ở hai cửa khác nhau cùng quét một mã QR (lỗi thao tác/gian lận) trong lúc mất mạng, khi cả hai App cùng Auto-sync lên Server, Backend sẽ chốt bản ghi gửi lên đầu tiên là hợp lệ, bản ghi thứ hai được lưu vào bảng Log gian lận/Cảnh báo để Admin rà soát, không làm sập Database.

## Ràng buộc
- **Thiết kế Offline-First Tuyệt đối**: Thao tác xác minh vé và đổi trạng thái (Bước 3, 4) BẮT BUỘC phải thực hiện 100% dựa trên Local DB của máy. Nghiêm cấm việc gọi API trực tiếp lên Server để verify mỗi lần quét nhằm đảm bảo tốc độ phản hồi cực nhanh (< 200ms) và không phụ thuộc mạng.
- **Xác minh Chữ ký số (Signature Verification)**: Để chống việc tự tạo QR giả, mã QR phải là JWT được ký. Mobile App phải có khả năng xác thực chuỗi chữ ký (bằng Public Key) ngay cả khi đang Offline trước khi tra cứu Local DB.
- **Tối ưu năng lượng (Battery & Performance)**: Luồng xử lý Camera quét liên tục tốn rất nhiều pin. React Native App phải cấu hình tự động tạm ngưng (pause) camera khi quét thành công hoặc khi Staff thoát ra màn hình khác, tránh nóng máy khi phải hoạt động liên tục 2-3 tiếng.
- **Đồng bộ theo lô (Batch Sync)**: API nhận dữ liệu đồng bộ phải hỗ trợ mảng (Array). App không được gọi API riêng lẻ cho từng lần quét khi có mạng trở lại để tiết kiệm băng thông và giảm tải HTTP Request cho Backend.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Thời gian từ khi camera bắt nét được mã QR đến lúc App hiển thị màn hình xanh lá cây thành công không được vượt quá 200ms (Trải nghiệm Real-time).
- Thiết bị của Staff được đưa vào "Chế độ máy bay" (Offline hoàn toàn), thao tác quét QR đối với các vé hợp lệ vẫn diễn ra bình thường, âm thanh và màu sắc hiển thị đúng trạng thái.
- Khi tắt "Chế độ máy bay" để cấp mạng lại, tự động Background Sync hoạt động mượt mà, toàn bộ các bản ghi check-in lưu tạm lập tức xuất hiện đầy đủ trong Database của Server trong vòng dưới 10 giây.
- Mã QR đã quét thành công (dù là quét Offline) nếu mang ra quét lại lần thứ 2 trên cùng thiết bị đó sẽ lập tức bị từ chối với màn hình đỏ.
- Giả lập việc tạo một mã QR chứa một chuỗi text bừa bãi, App đọc được nhưng phải nhận diện là sai cấu trúc bảo mật (JWT) và báo lỗi vé giả.
