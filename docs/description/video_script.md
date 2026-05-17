# KỊCH BẢN QUAY CLIPS DEMO TÍNH NĂNG UNIHUB WORKSHOP (ĐÃ CẬP NHẬT)

---

## 📹 Clip 1: Tải trọng đột biến & Tranh chấp chỗ ngồi (Spike Traffic & Seat Concurrency Load Test)
* **Thời lượng:** ~3 phút
* **Mục tiêu demo:** Chứng minh hệ thống chịu tải cao và giải quyết triệt để tranh chấp chỗ ngồi cuối cùng thông qua file test `backend/src/tests/loadtest.js`.
* **Kịch bản thực hiện:**
  - **Mở giao diện:** Show trang Workshop chỉ còn **1 chỗ trống** duy nhất.
  - **Chạy load test:** Chạy k6 load test bằng lệnh `docker compose --profile test up k6` chạy file `backend/src/tests/loadtest.js` để giả lập tải spike cực lớn (200 requests/s, dồn dập hàng nghìn request đăng ký).
  - **Kết quả hiển thị:**
    - Show log k6: Tỷ lệ lỗi 5xx là 0%, hiển thị các mã code trả về hợp lệ gồm `201` (đăng ký thành công), `400` (đăng ký trùng), `409` (hết chỗ / tranh chấp chỗ cuối), và `429` (bị rate limit chặn để bảo vệ hệ thống).
    - Kiểm tra database: Số lượng đăng ký thành công của workshop không vượt quá dung lượng tối đa (chỉ đúng 1 người nhận được chỗ cuối cùng).
  - **Show code:** Show nhanh cơ chế Distributed Lock (Redis) và Middleware Rate Limiter ngăn chặn quá tải.

---

## 📹 Clip 2: Kháng lỗi Cổng thanh toán & Chống trừ tiền trùng lặp (Payment Gateway Resilience & Idempotency)
* **Thời lượng:** ~3 phút
* **Mục tiêu demo:** Hệ thống hoạt động bình thường khi cổng thanh toán sập; chống double-charge khi client retry.
* **Kịch bản thực hiện:**
  - **Giả lập cổng thanh toán sập:** Dừng service mock payment gateway hoặc cấu hình cho nó trả về lỗi timeout.
  - **Demo Circuit Breaker:**
    - Sinh viên bấm "Thanh toán". Hệ thống phát hiện lỗi liên tục và kích hoạt **Circuit Breaker** (chuyển sang trạng thái `Open`).
    - Các request thanh toán sau đó lập tức bị từ chối nhanh (Fail-Fast) kèm thông báo bảo trì thanh toán, tránh làm nghẽn luồng xử lý chính.
    - Sinh viên vẫn có thể duyệt lịch workshop, thông tin sự kiện bình thường (Graceful Degradation).
  - **Demo Idempotency:**
    - Bật lại cổng thanh toán. Giả lập client bị lag bấm nút "Thanh toán" liên tiếp 3 lần trong 1 giây (hoặc click double).
    - Nhờ có **Idempotency Key**, hệ thống chỉ ghi nhận và xử lý thanh toán đúng 1 lần duy nhất, 2 request trùng lặp sau trả về kết quả của request đầu tiên (không trừ tiền lần 2).
  - **Show code:** Show Middleware kiểm tra Idempotency Key trong Redis và cấu hình Circuit Breaker (Opossum).

---

## 📹 Clip 3: Check-in Ngoại tuyến & Đồng bộ tự động (Offline Check-in)
* **Thời lượng:** ~2-3 phút
* **Mục tiêu demo:** Check-in trơn tru cho sinh viên tại khu vực mất kết nối mạng và tự đồng bộ khi có mạng lại.
* **Kịch bản thực hiện:**
  - **Giả lập mất mạng:** Trên điện thoại (Mobile App), bật chế độ máy bay (Airplane Mode) hoặc tắt Wifi/Data.
  - **Thao tác Check-in:**
    - Dùng camera quét mã QR của sinh viên.
    - App hiển thị thông báo "Check-in ngoại tuyến thành công" (Offline Check-in) và lưu cục bộ.
    - Quét tiếp thêm 2-3 mã QR khác của sinh viên khác.
  - **Đồng bộ dữ liệu:**
    - Bật lại kết nối mạng trên điện thoại.
    - App tự động phát hiện mạng và đẩy tiến trình đồng bộ ngầm (Background Sync).
    - Trên Web Admin: Refresh trang danh sách tham dự, trạng thái của các sinh viên vừa quét lập tức chuyển sang "Đã check-in" kèm thời gian check-in chính xác.
  - **Show code:** Show cơ chế lưu trữ cục bộ SQLite và hàng đợi đồng bộ Sync Queue của Mobile App.

---

## 📹 Clip 4: Tích hợp dữ liệu CSV một chiều (One-Way CSV Batch Sync)
* **Thời lượng:** ~2 phút
* **Mục tiêu demo:** Nhập dữ liệu sinh viên từ file CSV ban đêm, xử lý dữ liệu lỗi và trùng lặp không làm dừng hệ thống.
* **Kịch bản thực hiện:**
  - **Chuẩn bị dữ liệu:** Tạo 1 file CSV chứa:
    - 5 dòng dữ liệu sinh viên mới hợp lệ.
    - 2 dòng dữ liệu lỗi (sai định dạng email, thiếu MSSV).
    - 2 dòng dữ liệu bị trùng lặp MSSV với hệ thống.
  - **Kích hoạt Sync:** Chạy script import CSV (hoặc trigger qua API nội bộ).
  - **Kết quả hiển thị:**
    - Log hệ thống hiển thị chi tiết: Import thành công 5 sinh viên mới, bỏ qua 2 dòng lỗi (ghi log cảnh báo), xử lý đè/bỏ qua dòng trùng hợp lệ.
    - Hệ thống web/app vẫn chạy ổn định, không gián đoạn trong suốt quá trình import.
  - **Show code:** Show batch processing logic và xử lý transaction khi import file lớn.

---

## 📹 Clip 5: Phân quyền truy cập (RBAC) & Tóm tắt thông tin bằng AI (Admin RBAC & AI Summary)
* **Thời lượng:** ~3 phút
* **Mục tiêu demo:** Quản lý quyền chặt chẽ giữa các vai trò và tính năng tự động tóm tắt tài liệu workshop bằng AI.
* **Kịch bản thực hiện:**
  - **Demo Phân quyền RBAC:**
    - Đăng nhập tài khoản **Sinh viên**: Chỉ được xem danh sách, chi tiết và đăng ký. Truy cập trang admin hoặc API check-in báo `403 Forbidden`.
    - Đăng nhập tài khoản **Nhân sự check-in**: Chỉ được mở giao diện quét QR, không thể tạo workshop.
    - Đăng nhập tài khoản **Admin**: Toàn quyền quản trị.
  - **Demo AI Summary:**
    - Admin tạo một Workshop mới và tải lên file PDF giới thiệu diễn giả/nội dung chi tiết.
    - Hệ thống đẩy tác vụ vào Background Worker. Worker đọc PDF, gửi nội dung đã làm sạch sang Gemini API để tóm tắt.
    - Sau khi hoàn tất, Sinh viên mở trang chi tiết Workshop thấy phần **"Tóm tắt nội dung bằng AI"** hiển thị đẹp mắt, trực quan.
  - **Show code:** Show Middleware check roles và code gọi API LLM tóm tắt PDF.

---

## 📹 Clip 6: Đa kênh thông báo không đồng bộ qua RabbitMQ & Khả năng mở rộng (Async Multi-Channel Notifications via RabbitMQ)
* **Thời lượng:** ~2-3 phút
* **Mục tiêu demo:** Gửi thông báo xác nhận đăng ký cực nhanh, không đồng bộ qua RabbitMQ; tính dễ mở rộng của hệ thống thông báo bằng Strategy Pattern.
* **Kịch bản thực hiện:**
  - **Thực hiện đăng ký:** Sinh viên đăng ký workshop thành công.
  - **Demo xử lý bất đồng bộ:**
    - Show nhanh message được đẩy tức thì vào RabbitMQ queue (`notification_queue`) để xử lý ngầm, giúp phản hồi của API đăng ký cực kỳ nhanh chóng.
    - Chạy `notificationWorker.js`: Log hiển thị worker consume message và phân phối thành công thông báo qua Email, In-app push.
  - **Khả năng mở rộng (Strategy Pattern):**
    - Show code phần phân tách Strategy (`EmailStrategy`, `PushStrategy`).
    - Chứng minh việc thêm kênh Telegram chỉ cần kế thừa lớp cha `NotificationStrategy` mà không ảnh hưởng gì tới core business logic của đăng ký.
