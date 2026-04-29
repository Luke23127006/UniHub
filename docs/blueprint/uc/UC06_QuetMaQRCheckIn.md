| Section | Description |
| :--- | :--- |
| **Use Case Name** | UC06 - Quét Mã QR Check-in |
| **Initial assumption** | Nhân sự check-in đã đăng nhập bằng Mobile App. Sinh viên đã đăng ký thành công và có mã QR hợp lệ để xuất trình tại cửa phòng. |
| **Normal** | 1. Sinh viên đưa mã QR cho nhân sự check-in.<br>2. Nhân sự check-in dùng chức năng quét mã trên Mobile App.<br>3. App kiểm tra tính hợp lệ của mã QR trên hệ thống (hoặc lưu cục bộ nếu offline).<br>4. App ghi nhận trạng thái check-in thành công và phát tín hiệu/hiển thị màn hình thành công xanh lá cây. |
| **What can go wrong** | - Mất kết nối mạng tại khu vực check-in: App tự động chuyển sang chế độ Offline, quét và lưu kết quả check-in tạm thời vào bộ nhớ cục bộ của điện thoại để không làm gián đoạn dòng người chờ.<br>- Mã QR không hợp lệ, giả mạo, hoặc đã được quét trước đó: App sẽ báo lỗi (màn hình đỏ, âm thanh cảnh báo). |
| **Other activities** | Nếu app đang chạy trong chế độ offline, ngay khi phát hiện có kết nối mạng trở lại, app tự động đồng bộ đẩy toàn bộ lịch sử check-in offline lên hệ thống server trung tâm. |
| **System state on completion** | Trạng thái của sinh viên cho workshop tương ứng được cập nhật thành "đã tham gia" trong cơ sở dữ liệu trên server, hoặc lưu trữ trên thiết bị điện thoại chờ đồng bộ. |
