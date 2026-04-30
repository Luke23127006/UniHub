# UniHub Workshop — Technical Design

## Kiến trúc tổng thể
Hệ thống UniHub Workshop áp dụng kiến trúc Client-Server kết hợp Xử lý bất đồng bộ (Asynchronous Processing) để đáp ứng được tải trọng cao và đảm bảo trải nghiệm người dùng không bị gián đoạn.

Các thành phần giao tiếp với nhau như sau:

- Frontend (Clients):
  - Web App (Sinh viên & Ban tổ chức): Tương tác qua RESTful APIs.
  - Mobile App (Nhân sự Check-in): Xây dựng bằng React Native (Expo), thiết kế theo chuẩn Offline-first. App lưu trữ dữ liệu workshop cục bộ và đồng bộ (sync) với server khi có mạng.
- Backend API (Node.js): Đóng vai trò là bộ não xử lý nghiệp vụ chính (Đăng ký, Xác thực, Thống kê, Quản lý).
- Message Broker (RabbitMQ): Được sử dụng để tách rời (decouple) các tác vụ tốn thời gian hoặc phụ thuộc bên thứ 3 (Gửi Email/App Notification, Xử lý Webhook thanh toán, Tóm tắt AI) ra khỏi luồng xử lý chính của người dùng.
- Database & Caching: PostgreSQL lưu trữ dữ liệu bền vững (Persistent Data). Redis đảm nhận vai trò Caching, Distributed Lock (khóa phân tán) và Rate Limiting.

## C4 Diagram

### Level 1 — System Context
Sơ đồ này mô tả các tác nhân (Actors) và mối quan hệ của UniHub với các hệ thống bên ngoài.

![System Context Diagram](./diagrams/1_context.png)
*> [File PUML](./diagrams/1_context.puml)*

---

### Level 2 — Container Diagram
Sơ đồ phân rã hệ thống thành các Container có thể triển khai độc lập, thể hiện công nghệ (Node.js, PostgreSQL, Redis, RabbitMQ).

![Container Diagram](./diagrams/2_container.png)
*> [File PUML](./diagrams/2_container.puml)*

---

## 2. High-Level Architecture & Data Flow
Sơ đồ mô tả chi tiết luồng dữ liệu khi có 12.000 sinh viên đăng ký cùng lúc, cơ chế xử lý Offline và Circuit Breaker cho thanh toán.

![Architecture Diagram](./diagrams/3_architecture.png)
*> [File PUML](./diagrams/3_architecture.puml)*

## Thiết kế cơ sở dữ liệu
Loại Database: Relational Database (Cơ sở dữ liệu quan hệ) - PostgreSQL.

Lý do lựa chọn: Việc đăng ký chỗ ngồi và thanh toán yêu cầu tính nhất quán dữ liệu cực kỳ cao (ACID compliance) để tránh sai sót tài chính và bán lố vé.

Schema các entity chính (Core Entities):

- users: Lưu thông tin tài khoản đăng nhập và mật khẩu (hashed).
- students: Lưu hồ sơ sinh viên (được đồng bộ từ file CSV). Trường user_id là nullable để hỗ trợ sinh viên chưa từng đăng nhập hệ thống.
- workshops: Lưu thông tin sự kiện, diễn giả, thời gian và trường quan trọng available_seats (số ghế trống).
- registrations: Lưu vé đăng ký. Khóa Unique trên cặp (student_id, workshop_id) để chống đăng ký trùng. Trường status bao gồm các trạng thái: PENDING_PAYMENT, CONFIRMED, CANCELLED.
- payments: Quản lý các giao dịch thanh toán liên kết với registrations.
- checkins: Ghi nhận lịch sử quét mã QR. Có trường scanned_by_user_id để truy vết nhân sự nào đã cầm thiết bị quét (Audit Trail phục vụ đối soát offline/online).
- idempotency_keys: Bảng/Cache lưu trữ các khóa chống trùng lặp giao dịch toàn cục.

## Thiết kế kiểm soát truy cập
Hệ thống sử dụng mô hình Role-Based Access Control (RBAC) kết hợp với JWT (JSON Web Token) để xác thực (Authentication) và phân quyền (Authorization).

Các nhóm người dùng (Roles):

- Student (Sinh viên): Giới hạn chỉ được đọc/ghi dữ liệu của chính mình (vé đã mua, thông báo cá nhân).
- Staff (Nhân sự Check-in): Chỉ có quyền truy cập qua Mobile App để gọi các API lấy danh sách sinh viên của workshop được phân công và API cập nhật trạng thái checkins. Không có quyền tạo/sửa workshop.
- Admin (Ban tổ chức): Toàn quyền CRUD trên hệ thống (Quản lý workshop, nhân sự, xem thống kê toàn cục, trigger AI tóm tắt).

Cách kiểm tra quyền:

- Client gửi JWT qua header Authorization: Bearer <token>.
- API Gateway / Middleware tại Backend sẽ giải mã JWT, kiểm tra tính hợp lệ và trích xuất Role.
- Mỗi Endpoint sẽ được gắn decorator/middleware kiểm tra Role tương ứng. Nếu vi phạm, trả về lỗi 403 Forbidden.

## Thiết kế các cơ chế bảo vệ hệ thống

### Kiểm soát tải đột biến
Giải pháp: Sử dụng Redis Distributed Lock kết hợp Rate Limiting.

Cơ chế hoạt động: Khi sinh viên nhấn đăng ký, hệ thống sẽ tạo một khóa phân tán trên Redis cho workshop_id tương ứng. Các request vào sau sẽ phải đợi hoặc bị từ chối sớm (Fail-fast) nếu số lượng ghế trong RAM/Cache đã chạm mức 0, chặn hoàn toàn tình trạng Overbooking.

Hành vi: Vượt ngưỡng Rate Limit trả về 429 Too Many Requests. Hết chỗ trả về 400 Bad Request với message "Workshop đã hết chỗ".

### Xử lý cổng thanh toán không ổn định
Giải pháp: Áp dụng design pattern Circuit Breaker (Ngắt mạch).

Ngưỡng kích hoạt: Nếu các API gọi sang Mock Payment Gateway gặp lỗi timeout hoặc HTTP 5xx liên tục (ví dụ: 3 lần liên tiếp theo PoC của nhóm).

Hành vi khi lỗi: Circuit chuyển sang trạng thái OPEN. Các request thanh toán tiếp theo sẽ bị Backend từ chối ngay lập tức (Fail-fast) trả về lỗi hệ thống bận, tránh tình trạng chờ timeout làm nghẽn toàn bộ server. Sau 1 khoảng thời gian (Timeout TTL), mạch chuyển sang HALF-OPEN cho phép thử một vài request để xem Gateway đã sống lại chưa.

### Chống trừ tiền hai lần
Cơ chế: Kỹ thuật Idempotency Key.

Nơi lưu trữ: Lưu tại Global Cache (Redis) hoặc bảng idempotency_keys trong DB.

Luồng xử lý: Client (Web/Mobile) sinh ra một mã UUID duy nhất cho mỗi nỗ lực thanh toán/đăng ký và nhét vào header Idempotency-Key. Backend kiểm tra key này trong Redis.

Nếu chưa tồn tại: Xử lý giao dịch và lưu kết quả vào cache kèm TTL (vd: 24h).

Nếu đã tồn tại: Không xử lý lại logic (không trừ tiền lần 2), mà lấy ngay Response cũ đã lưu ở cache để trả về cho người dùng.

## Các quyết định kỹ thuật quan trọng (ADR)
### ADR 1: Chọn PostgreSQL (SQL) thay vì MongoDB (NoSQL)

Lý do: Hệ thống xử lý đăng ký vé (trừ số lượng ghế) và thanh toán, yêu cầu tuân thủ nguyên tắc ACID khắt khe. Dữ liệu có cấu trúc và tính quan hệ chặt chẽ giữa Student - Registration - Payment.

Đánh đổi: Việc scale (mở rộng) theo chiều ngang sẽ khó hơn so với NoSQL, nhưng có thể giải quyết bằng các cơ chế Cache và Queues.

### ADR 2: Sử dụng Message Queue (RabbitMQ) cho Notifications và Webhooks

Lý do: Giảm thời gian chờ của người dùng. API đăng ký chỉ cần ghi DB xong là trả về "Thành công", việc gửi Email hay tạo mã QR sẽ được đẩy vào RabbitMQ để Worker xử lý ngầm. Đồng thời giúp nhận Webhook thanh toán một cách an toàn mà không sợ rớt gói tin nếu server bận.

Đánh đổi: Tăng độ phức tạp khi vận hành hệ thống, cần theo dõi (monitor) queue.

### ADR 3: Sử dụng React Native (Expo) cho ứng dụng Check-in

Lý do: Phát triển nhanh (Fast development cycle), chỉ cần code bằng JavaScript/TypeScript (đồng nhất stack với backend Node.js), dễ dàng tích hợp thư viện quét mã QR và hỗ trợ lưu trữ cục bộ để xử lý Offline.

Đánh đổi: Hiệu năng có thể kém hơn so với code Native (Swift/Kotlin), tuy nhiên với ứng dụng check-in đơn giản thì sự chênh lệch này là không đáng kể.