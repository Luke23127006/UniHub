# UniHub Workshop — Project Proposal

## Vấn đề

Trường Đại học A hiện đang tổ chức "Tuần lễ kỹ năng và nghề nghiệp" hàng năm kéo dài trong 5 ngày, với quy mô 8–12 workshop diễn ra song song mỗi ngày. Quy trình hiện tại đang sử dụng Google Form để quản lý đăng ký và gửi thông báo thủ công qua email.

Cách làm này tồn tại nhiều rủi ro nghiêm trọng khi quy mô sinh viên ngày càng lớn:

- Quá tải và sai sót thủ công: Không thể kiểm soát tự động số lượng sinh viên đăng ký theo thời gian thực, dẫn đến rủi ro bán lố vé (overbooking) cho các phòng chỉ có số lượng chỗ ngồi giới hạn (ví dụ: 60 chỗ).

- Trải nghiệm người dùng đứt gãy: Thiếu thông tin trực quan như sơ đồ phòng học, và việc check-in tại cửa phòng hoàn toàn thủ công gây ùn tắc nghiêm trọng tại sự kiện.

- Không đáp ứng được tải trọng cao: Nền tảng hiện tại không được thiết kế để xử lý hàng ngàn request đồng thời với logic nghiệp vụ phức tạp về thanh toán và kiểm tra tình trạng giữ chỗ.

## Mục tiêu
Xây dựng hệ thống UniHub Workshop nhằm số hóa toàn diện quy trình từ bước xem lịch, đăng ký của sinh viên đến bước check-in tại sự kiện. Các mục tiêu cốt lõi bao gồm:

- Hiệu năng (Performance): Hệ thống phải chịu tải mượt mà khi có 12.000 sinh viên truy cập đồng thời trong 10 phút đầu mở cổng đăng ký (60% lưu lượng dồn vào 3 phút đầu) mà không bị sập hay gián đoạn dịch vụ.

- Chính xác (Consistency): Đảm bảo 100% không xảy ra tranh chấp chỗ ngồi, tuyệt đối không có 2 sinh viên nào cùng nhận được 1 chỗ cuối cùng.

- Tự động hóa & Chuyển đổi số: Tự động tạo mã QR dùng để check-in, tự động gửi thông báo xác nhận qua nhiều kênh (email, app), và tự động bóc tách, tóm tắt nội dung PDF giới thiệu workshop bằng mô hình AI.

## Người dùng và nhu cầu
Hệ thống phục vụ 3 nhóm người dùng chính với các quyền hạn phân lập chặt chẽ:

- Sinh viên: Có nhu cầu xem lịch trình sự kiện chi tiết (diễn giả, sơ đồ phòng, số vé còn lại theo thời gian thực), đăng ký (miễn phí hoặc có phí), nhận thông báo và lấy mã QR để đi tham dự.

- Ban tổ chức (Admin): Cần một nền tảng quản trị nội bộ để tạo mới, cập nhật thông tin, đổi phòng/giờ, hủy workshop, tải lên file PDF giới thiệu và xem thống kê số lượng sinh viên đăng ký.

- Nhân sự check-in: Cần một ứng dụng di động (Mobile App) tốc độ cao để quét mã QR của sinh viên tại cửa phòng sự kiện, đảm bảo không bị gián đoạn tiến độ công việc ngay cả khi khu vực check-in bị mất kết nối mạng.

## Phạm vi
### Trong phạm vi (In-scope):

- Xây dựng Web App gộp chung cho Sinh viên và Ban tổ chức, điều hướng an toàn thông qua kiểm soát phân quyền RBAC ở tầng Backend.

- Xây dựng Mobile App phục vụ luồng quét QR ưu tiên ngoại tuyến (Offline-First) dành riêng cho nhân sự check-in.

- Phát triển Backend API tích hợp đầy đủ các cơ chế chịu tải và bảo vệ: Rate Limiting, Message Queue (RabbitMQ), Distributed/Pessimistic Locking.

- Tích hợp mô hình AI API để xử lý và tóm tắt văn bản từ file PDF.

- Triển khai Background Worker để định kỳ đọc file CSV dữ liệu sinh viên.

### Ngoài phạm vi (Out-of-scope):

- Không tích hợp với hệ thống cổng thanh toán thật (chỉ dùng Mock API kết hợp Circuit Breaker để giả lập các kịch bản lỗi).

- Không gọi API trực tiếp để lấy dữ liệu từ hệ thống quản lý sinh viên cũ của trường (chỉ đọc file CSV được export một chiều).

- Không yêu cầu triển khai hạ tầng Production thực tế lên các dịch vụ Cloud (sử dụng Docker Compose chạy local kèm Seed data là đủ để khởi chạy và đánh giá tính năng).

## Rủi ro và ràng buộc
Đồ án này đối mặt với 5 bài toán kỹ thuật lớn bắt buộc phải giải quyết triệt để:

- **Tranh chấp chỗ ngồi (Race Condition)**: Phải áp dụng cơ chế khóa ở tầng Database (ví dụ: Pessimistic Locking với SELECT ... FOR UPDATE) để ngăn ngừa lỗi cấp lố vé khi hàng trăm người giành giật các vị trí cuối.

- **Tải trọng đột biến (Spike Load)**: Backend API phải được bảo vệ bởi thuật toán Rate Limiting (Token Bucket) kết hợp với Message Broker (RabbitMQ) để đưa request vào hàng đợi, tránh sập server.

- **Thanh toán không ổn định**: Thiết lập Circuit Breaker (với các trạng thái Closed/Open/Half-Open) để ngắt kết nối bảo vệ hệ thống khi cổng thanh toán sập, kết hợp Graceful Degradation để duy trì luồng đăng ký vé miễn phí. Đồng thời, áp dụng Idempotency Key để chống trừ tiền hai lần đối với các client retry nhiều lần.

- **Check-in offline**: Sóng viễn thông và wifi tại sự kiện có thể không ổn định. Ứng dụng di động phải có Local Database lưu trữ lịch sử check-in tạm thời và cơ chế tự động đồng bộ lại (Auto-Sync) mà không làm mất mát dữ liệu khi có mạng.

- **Tích hợp một chiều file CSV**: File CSV dữ liệu sinh viên có thể chứa dữ liệu trùng hoặc dòng bị lỗi. Hệ thống phải dùng phương pháp đọc luồng (Stream Processing) để tránh tràn bộ nhớ RAM và áp dụng kỹ thuật Upsert vào DB một cách liền mạch.