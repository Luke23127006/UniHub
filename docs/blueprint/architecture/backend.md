# UniHub Workshop - Backend Folder Structure

Tài liệu này chi tiết cấu trúc thư mục cho phần Backend (Node.js/Express) của dự án UniHub Workshop, áp dụng mô hình **Layered Architecture** để đảm bảo tính mở rộng và bảo trì.

## 1. Sơ đồ cấu trúc thư mục

```text
src/
├── config/          # Cấu hình hệ thống (Env, DB, Redis, RabbitMQ)
├── models/          # Định nghĩa Schema/Entity (Bản thiết kế dữ liệu)
├── repositories/    # Tầng truy xuất dữ liệu (Data Access Layer)
├── services/        # Tầng nghiệp vụ cốt lõi (Business Logic Layer)
├── controllers/     # Bộ điều hướng (Handling Requests/Responses)
├── routes/          # Định nghĩa các Endpoint API
├── middlewares/     # Các hàm tiền xử lý (Auth, RBAC, Circuit Breaker)
├── jobs/            # Tác vụ chạy ngầm (Workers, Cronjobs)
└── utils/           # Các hàm bổ trợ (JWT, mã hóa, helpers)
```

## 2. Giải thích chi tiết và Lý do

| Thư mục         | Vai trò                                                          | Tại sao cần / Nếu không có thì sao?                                                                                  |
| :-------------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `config/`       | Quản lý tập trung các kết nối đến DB, Redis, RabbitMQ.           | Tránh hard-code thông tin nhạy cảm. Nếu không có, việc đổi môi trường (Dev/Prod) sẽ cực kỳ khó khăn.                 |
| `models/`       | Định nghĩa cấu trúc bảng dữ liệu (ORM).                          | Đảm bảo tính nhất quán của dữ liệu. Nếu không có, ứng dụng sẽ không kiểm soát được các trường dữ liệu truyền vào.    |
| `repositories/` | Nơi duy nhất thực hiện các câu lệnh SQL/ORM.                     | Tách biệt logic truy vấn khỏi logic nghiệp vụ. Giúp dễ dàng chuyển đổi DB hoặc thực hiện Unit Test (Mocking).        |
| `services/`     | Xử lý logic chính (Xếp hàng RabbitMQ, thanh toán, AI).           | Giữ cho Controller gọn nhẹ (Lean Controller). Nếu không có, code nghiệp vụ sẽ bị lặp lại ở nhiều nơi.                |
| `controllers/`  | Tiếp nhận request từ FE, gọi Service và trả response.            | Phân tách trách nhiệm giao tiếp HTTP. Nếu không có, logic code và logic hiển thị sẽ bị trộn lẫn (Spaghetti code).    |
| `middlewares/`  | Chốt chặn bảo mật (JWT), kiểm tra quyền (RBAC), Circuit Breaker. | Tái sử dụng logic kiểm tra cho nhiều API. Nếu không có, bạn phải copy-paste code bảo mật vào hàng chục endpoint.     |
| `jobs/`         | Xử lý các tác vụ tốn thời gian (CSV import, gửi email).          | Giữ cho API luôn phản hồi nhanh dưới áp lực cao (12k request). Nếu không có, hệ thống sẽ bị treo khi xử lý file lớn. |

## 3. Tại sao chọn kiến trúc này?

- **Chịu tải cao**: Tách biệt jobs và services giúp tối ưu hóa tài nguyên cho các tác vụ nặng.
- **Dễ Test**: Việc tách repositories giúp Duy và Luân có thể test logic mà không cần kết nối Database thật.
- **An toàn thanh toán**: middlewares chứa Circuit Breaker giúp hệ thống không bị sập dây chuyền khi cổng thanh toán lỗi.
