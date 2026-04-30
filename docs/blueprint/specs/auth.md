# Đặc tả: Đăng nhập & Quản lý phiên (UC00)

## Mô tả
Tính năng cho phép người dùng (Sinh viên, Ban tổ chức, Nhân sự check-in) xác thực danh tính để truy cập vào hệ thống UniHub Workshop. Hệ thống hỗ trợ đăng nhập thông qua tài khoản cấp sẵn (email/mật khẩu) hoặc thông qua hệ thống SSO của trường. Sau khi xác thực thành công, hệ thống sinh ra JWT token (bao gồm Access Token và Refresh Token) để thiết lập và quản lý phiên làm việc, đồng thời phục vụ cho cơ chế Kiểm soát truy cập dựa trên vai trò (RBAC).

## Luồng chính
1. Người dùng mở ứng dụng (Mobile App hoặc Web App) và điều hướng đến màn hình đăng nhập.
2. Người dùng cung cấp thông tin xác thực bằng cách nhập email/mật khẩu hoặc chọn đăng nhập qua SSO của trường.
3. Hệ thống tiếp nhận yêu cầu và xử lý xác thực:
   - Nếu dùng email/mật khẩu: Kiểm tra thông tin định danh và đối chiếu mật khẩu với cơ sở dữ liệu.
   - Nếu dùng SSO: Chuyển hướng yêu cầu đến dịch vụ xác thực bên thứ 3, nhận phản hồi và xác minh token trả về.
4. Hệ thống truy xuất dữ liệu người dùng tương ứng và xác định vai trò (Role: Student, Staff, Admin).
5. Hệ thống khởi tạo phiên làm việc bằng cách sinh chuỗi JSON Web Token (JWT), bao gồm:
   - Access Token: Chứa Payload định danh (sub, email, role) để ủy quyền các request tiếp theo.
   - Refresh Token: Dùng để xin cấp lại Access Token khi hết hạn.
6. Hệ thống lưu lại lịch sử (log) đăng nhập nhằm phục vụ mục đích bảo mật và audit.
7. Hệ thống trả về token cho Client và điều hướng người dùng đến màn hình chức năng phù hợp với vai trò của họ.

## Kịch bản lỗi
- **Sai thông tin đăng nhập**: Nếu email hoặc mật khẩu không khớp, hệ thống từ chối xác thực, trả về lỗi HTTP 401 Unauthorized kèm yêu cầu nhập lại.
- **Tài khoản không tồn tại**: Nếu hệ thống không tìm thấy dữ liệu người dùng (ví dụ: Sinh viên chưa được đồng bộ từ file CSV vào hệ thống), hệ thống trả về lỗi HTTP 404 Not Found (hoặc 401) kèm hướng dẫn liên hệ bộ phận hỗ trợ.
- **Lỗi dịch vụ SSO**: Nếu hệ thống SSO của trường bị lỗi, timeout hoặc không phản hồi, hệ thống thông báo bảo trì tạm thời đối với tính năng đăng nhập SSO (HTTP 502/503/504) và gợi ý thử lại sau.
- **Tài khoản bị khóa/vô hiệu hóa**: Nếu trạng thái tài khoản không được phép đăng nhập, hệ thống từ chối cấp token và trả về lỗi HTTP 403 Forbidden.

## Ràng buộc
- **Bảo mật JWT**: Hệ thống sử dụng Bearer Token. Access Token phải có thời gian sống ngắn (ví dụ: 15 phút), Refresh Token có thời gian sống dài (ví dụ: 7 ngày). JWT phải được ký (signature) an toàn bằng Secret Key trên Backend.
- **Bảo mật dữ liệu**: Mật khẩu của người dùng (nếu có) bắt buộc phải được băm (hashing) bằng các thuật toán mã hóa một chiều (như bcrypt/argon2) trước khi lưu vào cơ sở dữ liệu.
- **Hiệu năng**: Quá trình phản hồi xác thực và cấp phát token phải nhanh chóng, độ trễ không vượt quá 2 giây để đảm bảo trải nghiệm người dùng.
- **Truy vết (Audit Log)**: Mọi sự kiện đăng nhập, bao gồm thành công và thất bại, đều phải được ghi log (thời gian, địa chỉ IP, User-Agent, trạng thái) để theo dõi và phát hiện các hành vi bất thường.

## Tiêu chí chấp nhận (Acceptance Criteria)
- Đăng nhập thành công với tài khoản (email/mật khẩu) hoặc SSO hợp lệ sẽ trả về HTTP status 200 OK cùng với cặp Access Token và Refresh Token.
- Khi đăng nhập sai email hoặc mật khẩu, hệ thống phải trả về HTTP status 401 Unauthorized và không cấp phát token.
- Khi đăng nhập với sinh viên chưa có dữ liệu trong hệ thống, phải trả về thông báo lỗi thân thiện hướng dẫn người dùng liên hệ hỗ trợ.
- Payload của Access Token khi giải mã (decode) phải hiển thị chính xác các trường: `sub` (ID người dùng), `email`, `role` (Student/Staff/Admin), `iat` (thời điểm tạo), và `exp` (thời điểm hết hạn).
- Hệ thống ghi nhận chính xác 1 record vào bảng lịch sử đăng nhập sau mỗi lần người dùng thực hiện luồng đăng nhập (bất kể thành công hay thất bại).
