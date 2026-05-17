# Tối ưu hóa Hiệu suất Ứng dụng Web với React 18 & Server Components

**Diễn giả:** ThS. Nguyễn Hoàng Anh
**Đơn vị công tác:** Tech Lead tại ZaloPay, Giảng viên thỉnh giảng Khoa CNTT - Trường Đại học KHTN.

## 1. Giới thiệu chung (Abstract)
Trong bối cảnh các ứng dụng web ngày càng phức tạp, việc duy trì trải nghiệm người dùng (UX) mượt mà và tốc độ tải trang nhanh chóng là một thách thức lớn. Phiên bản React 18 mang đến nhiều thay đổi mang tính cách mạng, đặc biệt là kiến trúc Server Components và cơ chế Concurrent Rendering. 
Workshop này sẽ cung cấp cho các bạn sinh viên và lập trình viên những kiến thức chuyên sâu về cách ứng dụng những tính năng mới nhất của React để giải quyết bài toán hiệu suất, giảm thiểu Time-To-Interactive (TTI) và tối ưu điểm số Core Web Vitals.

## 2. Thông tin sự kiện
- **Thời gian dự kiến:** 08:30 - 11:30, Thứ Bảy ngày 25/11/2026.
- **Địa điểm:** Hội trường I, Cơ sở Nguyễn Văn Cừ, Trường Đại học Khoa học Tự nhiên.
- **Đối tượng tham gia:** Sinh viên năm 3, năm 4 chuyên ngành Công nghệ phần mềm, và những ai quan tâm đến Frontend Development.

## 3. Nội dung chi tiết (Agenda)

### 3.1. Nhìn lại các vấn đề hiệu suất của React 17 trở về trước (08:30 - 09:15)
- Waterfalls trong Data Fetching.
- Vấn đề Bundle Size quá lớn do client-side rendering (CSR).
- Tại sao SSR (Server-Side Rendering) truyền thống chưa đủ tốt?

### 3.2. Kiến trúc React Server Components (RSC) (09:15 - 10:15)
- Khái niệm Server Components và sự khác biệt so với SSR.
- Cách RSC giúp giảm kích thước JavaScript bundle gửi xuống client bằng 0.
- Demo tích hợp Server Components trong Next.js 14.

*(Nghỉ giải lao 15 phút)*

### 3.3. Concurrent Features & Transitions (10:30 - 11:15)
- Sử dụng `useTransition` và `useDeferredValue` để ưu tiên các tác vụ render.
- Xử lý mượt mà các trải nghiệm tìm kiếm và lọc dữ liệu (Live Search).
- Streaming SSR với `<Suspense>`.

### 3.4. Q&A và Networking (11:15 - 11:30)
- Hỏi đáp trực tiếp cùng diễn giả.
- Cơ hội phỏng vấn thực tập sinh (Internship) tại ZaloPay dành cho các bạn có câu hỏi hay nhất.

## 4. Tài liệu tham khảo & Yêu cầu chuẩn bị
- Các bạn tham gia vui lòng mang theo Laptop đã cài sẵn Node.js (phiên bản 18 trở lên).
- Cài đặt sẵn VS Code và clone source code mẫu tại kho lưu trữ Github của sự kiện (được gửi qua email sau khi đăng ký).
- Đọc trước tài liệu chính thức của React về Server Components.

---
*Tài liệu nội bộ phục vụ cho Workshop Tech-Talk Mùa Thu 2026.*
