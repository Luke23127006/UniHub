| Section | Description |
| :--- | :--- |
| **Use Case Name** | UC05 - Tạo Tóm Tắt AI Bằng File PDF |
| **Initial assumption** | Ban tổ chức đang sử dụng chức năng thêm/sửa workshop và có một file giới thiệu định dạng PDF. |
| **Normal** | 1. Ban tổ chức tải lên file PDF giới thiệu về nội dung workshop.<br>2. Hệ thống lưu trữ file an toàn.<br>3. Hệ thống tự động tách xuất (extract) nội dung chữ và làm sạch văn bản.<br>4. Hệ thống gửi văn bản đã xử lý sang một mô hình AI qua API để yêu cầu tóm tắt.<br>5. Hệ thống nhận kết quả trả về, lưu trữ và hiển thị nội dung tóm tắt trên trang chi tiết workshop. |
| **What can go wrong** | - File tải lên bị hỏng, mã hóa, hoặc không có văn bản: Hệ thống thông báo lỗi không xử lý được.<br>- API kết nối tới mô hình AI bị lỗi hoặc quá thời gian phản hồi: Hệ thống sẽ đánh dấu thất bại và đưa vào hàng đợi tự động thử lại (retry) sau. |
| **Other activities** | Các thao tác như tách văn bản và gọi API AI được đẩy vào Background Worker/Message Queue để xử lý bất đồng bộ nhằm tránh bị nghẽn (block) quá trình tạo workshop của Ban tổ chức. |
| **System state on completion** | Bản tóm tắt bằng văn bản được tạo ra và được liên kết (lưu vào CSDL) với workshop tương ứng, hiển thị sẵn sàng cho sinh viên đọc. |
