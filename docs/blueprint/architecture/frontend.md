# UniHub Workshop - Frontend Folder Structure

Tài liệu này mô tả cấu trúc thư mục cho phần Frontend (ReactJS/AntD) của dự án UniHub Workshop, áp dụng mô hình Feature-based Structure.

## 1. Sơ đồ cấu trúc thư mục

```text
src/
├── components/      # Các UI Component dùng chung (Button, Input, Table)
├── features/        # Chia theo tính năng người dùng (Auth, Admin, Registration)
│   ├── auth/        # Đăng nhập, phân quyền
│   ├── workshop/    # Xem danh sách, chi tiết
│   ├── registration/# Luồng đăng ký & thanh toán
│   └── admin/       # Dashboard quản lý cho BTC
├── hooks/           # Các Custom Hooks (useAuth, useRealtimeSeats)
├── services/        # Định nghĩa các hàm gọi API (Axios instance)
├── store/           # Quản lý State toàn cục (Zustand/Redux)
└── utils/           # Định dạng ngày, xử lý mã QR, validators
```

## 2. Giải thích chi tiết và Lý do

| Thư mục       | Vai trò                                                     | Tại sao cần / Nếu không có thì sao?                                                                                                       |
| :------------ | :---------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `components/` | Chứa các thành phần giao diện nhỏ, có thể tái sử dụng.      | Đảm bảo tính đồng nhất UI (Atomic Design). Nếu không có, giao diện sẽ bị lệch lạc ở các trang khác nhau.                                  |
| `features/`   | Gom nhóm logic, giao diện theo từng module chức năng.       | Giúp Lộc và Duy làm việc song song mà không bị xung đột code (Conflict). Nếu không có, thư mục `pages/` sẽ quá tải với hàng trăm file.    |
| `hooks/`      | Tách biệt logic xử lý UI ra khỏi phần hiển thị.             | Ví dụ `useRealtimeSeats` giúp cập nhật số ghế mà không làm rối code giao diện. Nếu không có, logic xử lý SSE/WebSocket sẽ bị lặp lại.     |
| `services/`   | Tập trung quản lý các endpoint gọi về Backend.              | Khi Luân (Backend) thay đổi URL API, Lộc chỉ cần sửa ở 1 nơi duy nhất. Nếu không có, bạn phải đi tìm từng file để sửa `fetch()`.          |
| `store/`      | Lưu trữ dữ liệu dùng chung (thông tin User, trạng thái vé). | Tránh tình trạng truyền dữ liệu qua quá nhiều tầng component (Prop Drilling). Nếu không có, quản lý trạng thái đăng nhập sẽ rất phức tạp. |

## 3. Đặc thù dự án UniHub

- **Real-time**: Sử dụng `hooks/` để quản lý các kết nối Server-Sent Events (SSE) lấy số ghế.
- **Phân quyền**: Module `features/auth` kết hợp với middlewares ở Backend để hiển thị giao diện tương ứng cho Admin/Student.
- **Offline-first (Mobile)**: Cấu trúc tương tự được áp dụng cho bản Mobile để quản lý đồng dữ liệu qua `services/` và `store/`.