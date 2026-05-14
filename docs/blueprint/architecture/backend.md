# UniHub Workshop - Backend Folder Structure

Tài liệu này chi tiết cấu trúc thư mục cho phần Backend (Node.js/Express) của dự án UniHub Workshop. Hệ thống áp dụng mô hình **Controller-Service Architecture**, tận dụng sức mạnh của Prisma ORM để tối ưu hóa việc xử lý luồng dữ liệu và transaction.

## 1. Sơ đồ cấu trúc thư mục

```text
src/
├── config/          # Cấu hình hệ thống (Env, Prisma Client, Redis, RabbitMQ)
├── prisma/          # Chứa file schema.prisma và các bản Migration
├── services/        # Tầng nghiệp vụ cốt lõi và Tương tác Database (Unit of Work)
├── controllers/     # Bộ điều hướng (Handling Requests/Responses)
├── routes/          # Định nghĩa các Endpoint API
├── middlewares/     # Các hàm tiền xử lý (Auth, RBAC, Circuit Breaker)
├── jobs/            # Tác vụ chạy ngầm (Workers, Cronjobs)
└── utils/           # Các hàm bổ trợ (JWT, mã hóa, helpers)
```

## 2. Giải thích chi tiết và Lý do

| Thư mục        | Vai trò                                                          | Tại sao cần / Nếu không có thì sao?                                                                                  |
| :------------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `config/`      | Quản lý tập trung các kết nối đến DB, Redis, RabbitMQ.           | Tránh hard-code thông tin nhạy cảm. Nếu không có, việc đổi môi trường (Dev/Prod) sẽ cực kỳ khó khăn.                 |
| `prisma/`      | Nơi định nghĩa thiết kế dữ liệu (Schema) và phiên bản DB.        | Đảm bảo tính nhất quán của cấu trúc Database. Nếu không có, hệ thống không thể quản lý thay đổi DB qua từng Sprint.  |
| `services/`    | Xử lý logic chính (Xếp hàng RabbitMQ, thanh toán, AI).           | Giữ cho Controller gọn nhẹ (Lean Controller). Nếu không có, code nghiệp vụ sẽ bị lặp lại ở nhiều nơi.                |
| `controllers/` | Tiếp nhận request từ FE, gọi Service và trả response.            | Phân tách trách nhiệm giao tiếp HTTP. Nếu không có, logic code và logic hiển thị sẽ bị trộn lẫn (Spaghetti code).    |
| `middlewares/` | Chốt chặn bảo mật (JWT), kiểm tra quyền (RBAC), Circuit Breaker. | Tái sử dụng logic kiểm tra cho nhiều API. Nếu không có, bạn phải copy-paste code bảo mật vào hàng chục endpoint.     |
| `jobs/`        | Xử lý các tác vụ tốn thời gian (CSV import, gửi email).          | Giữ cho API luôn phản hồi nhanh dưới áp lực cao (12k request). Nếu không có, hệ thống sẽ bị treo khi xử lý file lớn. |

## 3. Tại sao chọn kiến trúc này?

- **Chịu tải cao**: Tách biệt jobs và services giúp tối ưu hóa tài nguyên cho các tác vụ nặng.
- **An toàn thanh toán**: middlewares chứa Circuit Breaker giúp hệ thống không bị sập dây chuyền (Cascading Failure) khi cổng thanh toán thứ 3 bị lỗi.
- **Dễ Test**: Dù gộp việc truy vấn Database vào Service, chúng ta vẫn có thể dùng các thư viện như jest-mock-extended để mock toàn bộ Prisma Client, giúp unit test tầng nghiệp vụ một cách độc lập.

## 4. Ghi chú Quyết định Kiến trúc (ADR): Lược bỏ tầng Repository
Bối cảnh: Trong các mô hình Layered Architecture truyền thống thường có tầng `repositories/` để tách biệt mã SQL/truy vấn khỏi tầng `services/`. Tuy nhiên, UniHub sử dụng Prisma ORM.

Quyết định: Team quyết định **KHÔNG** sử dụng pattern Repository mà để tầng Service tương tác trực tiếp với Prisma Client.

Lý do (Trade-off):

- Bản chất của Prisma: Bản thân `Prisma Client` đã đóng vai trò là một Generic Repository và Data Mapper hoàn chỉnh, việc bọc thêm một lớp Repository bên ngoài là thao tác thừa thãi (Over-engineering).

- Khó khăn với Transaction: Chức năng cốt lõi của UniHub là "Đăng ký vé dưới tải cao", đòi hỏi tính toàn vẹn dữ liệu (ACID) tuyệt đối. Khi kết hợp đọc và ghi (VD: kiểm tra số ghế -> trừ ghế -> tạo vé), Prisma bắt buộc dùng `prisma.$transaction(async (tx) => {...})`.

  - Nếu ép dùng Repository, đối tượng `tx` (đại diện cho một connection database) sẽ bị rò rỉ (leak) ngược lên tầng Service, phá vỡ chính nguyên tắc đóng gói của Repository.

  - Bằng cách để Service quản lý trực tiếp Prisma, Service sẽ đóng vai trò như một Unit of Work, đảm bảo logic nghiệp vụ và tính toàn vẹn transaction được gắn kết chặt chẽ và an toàn nhất.