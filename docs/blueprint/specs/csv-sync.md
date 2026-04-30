# Đặc tả: Đồng bộ dữ liệu Sinh viên (UC07)

## Mô tả
Tính năng "Đồng bộ dữ liệu Sinh viên" là một tác vụ chạy ngầm định kỳ (Background Cron Job) nhằm duy trì danh sách sinh viên hợp lệ của hệ thống UniHub Workshop luôn được cập nhật chính xác với cơ sở dữ liệu gốc của nhà trường. Tính năng này đóng vai trò sống còn trong việc kiểm soát quyền đăng nhập và định danh người dùng. Để xử lý khối lượng dữ liệu lớn (có thể lên tới hàng chục nghìn sinh viên) mà không gây tắc nghẽn hoặc sập Database, hệ thống áp dụng cơ chế đọc dữ liệu luồng (Streaming), xử lý theo lô (Batch Processing) và sử dụng lệnh Upsert nguyên tử.

## Luồng chính
1. Theo cấu hình lập lịch (Ví dụ: 02:00 AM mỗi ngày), một Worker của Backend (Node.js) tự động kích hoạt tiến trình đồng bộ.
2. Worker thiết lập kết nối an toàn đến máy chủ chia sẻ (FTP/SFTP) của nhà trường để tải về file danh sách sinh viên mới nhất (định dạng CSV).
3. Hệ thống tiến hành đọc file dưới dạng luồng dữ liệu (Streaming) nhằm tránh tải toàn bộ file dung lượng lớn vào bộ nhớ RAM.
4. Hệ thống phân tích (Parse) từng dòng CSV thành object JSON, đồng thời thực hiện Validation: kiểm tra mã số sinh viên, định dạng email (`@uni.edu.vn`), và các trường bắt buộc.
5. Hệ thống gom các bản ghi hợp lệ thành từng lô nhỏ (Batch) - ví dụ 1.000 bản ghi mỗi lô.
6. Worker đẩy từng lô vào PostgreSQL sử dụng lệnh **Upsert** (`INSERT ... ON CONFLICT DO UPDATE`):
   - Nếu Mã số sinh viên (MSSV) chưa tồn tại: Thêm mới bản ghi (Cấp quyền tham gia).
   - Nếu MSSV đã tồn tại: Cập nhật các thông tin cá nhân mới nhất (Tên, Lớp, Khoa, Trạng thái đang học/bảo lưu).
7. Kết thúc quá trình, Worker ghi nhận tổng số dòng xử lý thành công và thất bại vào bảng Log hệ thống.

## Kịch bản lỗi
- **Không tìm thấy file / Lỗi mạng**: Nếu kết nối FTP thất bại hoặc file CSV không được nhà trường xuất đúng giờ, tiến trình sẽ kết thúc sớm, ghi log mức `ERROR` và tự động gửi email/tin nhắn cảnh báo khẩn cấp cho bộ phận IT Admin để kiểm tra thủ công.
- **Dữ liệu rác / Sai định dạng cục bộ**: Nếu một vài dòng trong file CSV bị hỏng (thiếu email, sai format cột), hệ thống sẽ chủ động loại bỏ (skip) các dòng đó thay vì ném ra Exception làm văng (crash) toàn bộ tiến trình. Lỗi của các dòng này được lưu vào file Log riêng để truy vết, trong khi các sinh viên hợp lệ khác vẫn được Upsert bình thường.
- **Quá tải Database**: Nếu quá trình Bulk Upsert làm tăng tải I/O của PostgreSQL quá mức báo động, Worker có thể được cấu hình để tạm dừng (Sleep) vài trăm milliseconds giữa các lô (Batch) nhằm giảm áp lực cho DB, không làm ảnh hưởng đến các người dùng đang thức đêm truy cập hệ thống.

## Ràng buộc
- **Tối ưu RAM (Memory Efficiency)**: Bắt buộc phải sử dụng thư viện Stream Parsing (ví dụ `csv-parser` trong Node.js) để xử lý dữ liệu. Tuyệt đối không dùng các hàm như `fs.readFileSync` nạp toàn bộ file vào RAM để ngăn chặn lỗi Memory Leak khi dữ liệu trường tăng lên.
- **Tối ưu truy vấn (DB Optimization)**: Nghiêm cấm việc dùng vòng lặp `for` để gọi từng câu lệnh `INSERT/UPDATE` riêng lẻ cho hàng chục ngàn sinh viên. Bắt buộc sử dụng cơ chế Bulk Upsert.
- **Bảo mật kết nối**: Thông tin cấu hình, mật khẩu truy cập hệ thống FTP của trường phải được mã hóa và truyền vào qua biến môi trường (Environment Variables), tuyệt đối không hardcode trong mã nguồn.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Job đồng bộ tự động chạy chính xác vào khung giờ đã cấu hình.
- Khi chạy với một file CSV chứa 20.000 bản ghi, hệ thống xử lý (parse và Upsert) thành công toàn bộ trong thời gian tối ưu (< 1-2 phút) mà dung lượng RAM của Worker không bị tăng vọt.
- Khi chèn 5 dòng dữ liệu cố tình làm sai định dạng vào giữa file CSV hợp lệ, hệ thống vẫn lưu trữ thành công 19.995 sinh viên kia và ghi nhận 5 dòng lỗi vào bảng Log.
- Khi chạy đồng bộ liên tiếp 2 lần cùng một file CSV không có thay đổi, số lượng sinh viên trong Database giữ nguyên (không bị nhân đôi), chứng minh lệnh Upsert hoạt động đúng tính chất Idempotent.
- Một sinh viên mới được thêm vào qua file CSV đêm qua sẽ có thể đăng nhập thành công vào ứng dụng (qua UC00) vào sáng hôm sau.
