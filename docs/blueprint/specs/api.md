# Đặc tả API Hệ thống UniHub Workshop (API Specification)

Tài liệu này định nghĩa cấu trúc Request và Response cho các API cốt lõi của hệ thống UniHub.

- **Cơ chế Versioning:** Sử dụng URI Versioning (v1).
- **Base URL:** `http://localhost:3000/api` (hoặc domain thực tế khi deploy)
- **Quy ước Headers:**
  - `Content-Type: application/json`: Bắt buộc với các request có body JSON (thường là POST/PUT/PATCH).
  - `Authorization: Bearer <token>`: Chỉ bắt buộc với các endpoint có **Auth Required: Yes**.
  - `X-Idempotency-Key: <uuid>`: Chỉ bắt buộc với các endpoint yêu cầu idempotency, ví dụ API đăng ký vé.
  - Với các endpoint public hoặc webhook, chỉ gửi các header được yêu cầu ngay tại mô tả của endpoint đó.

---

## 1. Dành cho Sinh viên (Student)

### 1.1. Lấy danh sách Workshop đang mở

API public dùng để hiển thị lịch trình sự kiện trên Web/App.

- **Endpoint:** `/v1/workshops`
- **Method:** `GET`
- **Auth Required:** No

**Query Parameters (Optional):**

- `date` (string): Lọc theo ngày (YYYY-MM-DD)
- `category` (string): Lọc theo chủ đề

**Response (200 OK):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "ws_001",
      "title": "Kỹ năng quản lý thời gian cho Gen Z",
      "speaker": "TS. Nguyễn Văn A",
      "category": "Soft Skills",
      "description": "Giúp sinh viên tối ưu hóa 24 giờ mỗi ngày...",
      "startTime": "2024-05-20T08:00:00Z",
      "endTime": "2024-05-20T10:00:00Z",
      "room": {
        "name": "Hội trường A",
        "mapUrl": "https://unihub.com/maps/hall-a.png"
      },
      "pricing": {
        "isFree": true,
        "amount": 0
      },
      "seats": {
        "total": 100,
        "available": 42
      }
    }
  ]
}
```

### 1.2. Lấy thông tin chi tiết Workshop

- **Endpoint:** `/v1/workshops/:id`
- **Method:** `GET`
- **Auth Required:** No

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "id": "ws_001",
    "title": "Kỹ năng quản lý thời gian cho Gen Z",
    "speaker": "TS. Nguyễn Văn A",
    "description": "...",
    "aiSummary": "Bản tóm tắt nội dung chính từ file PDF đã được AI bóc tách...",
    "startTime": "2024-05-20T08:00:00Z",
    "endTime": "2024-05-20T10:00:00Z",
    "room": {
      "name": "Hội trường A",
      "mapUrl": "https://unihub.com/maps/hall-a.png"
    },
    "pricing": { "isFree": true, "amount": 0 },
    "seats": { "total": 100, "available": 42 }
  }
}
```

### 1.3. Đăng ký tham dự Workshop

- **Endpoint:** `/v1/tickets/register`
- **Method:** `POST`
- **Auth Required:** Yes (Role: Student)

**Request Body:**

```json
{
  "workshopId": "ws_001",
  "paymentMethod": "MOCK_GATEWAY"
}
```

**Response (201 Created) - TRƯỜNG HỢP CÓ PHÍ:**

Hệ thống sẽ giữ chỗ tạm thời và yêu cầu thanh toán.

```json
{
  "status": "success",
  "data": {
    "registrationId": "REG_123",
    "status": "PENDING_PAYMENT",
    "paymentUrl": "https://mock-gateway.com/pay/REG_123", // Link thanh toán
    "message": "Vui lòng hoàn tất thanh toán trong 15 phút để giữ chỗ."
  }
}
```

**Response (201 Created) - TRƯỜNG HỢP MIỄN PHÍ:**

Hệ thống xác nhận ngay và cấp mã QR.

```json
{
  "status": "success",
  "data": {
    "registrationId": "REG_456",
    "status": "CONFIRMED",
    "qrCodeUrl": "https://unihub.com/qr/TK_999.png",
    "message": "Đăng ký thành công!"
  }
}
```

**Error Responses:**

- `400 Bad Request`: `{"status": "error", "error": {"code": "SOLD_OUT", "message": "Workshop đã hết chỗ."}}`
- `429 Too Many Requests`: `{"status": "error", "error": {"code": "SYSTEM_BUSY", "message": "Hệ thống đang bận xử lý, vui lòng thử lại."}}`

## 2. Dành cho Ban Tổ Chức (Admin)

### 2.1. Tạo mới Workshop

- **Endpoint:** `/v1/workshops`
- **Method:** `POST`
- **Auth Required:** Yes (Role: Admin)

**Request Body:**

```json
{
  "title": "Ứng dụng AI trong học tập",
  "speaker": "ThS. Lê Văn B",
  "startTime": "2024-05-21T13:00:00Z",
  "endTime": "2024-05-21T15:00:00Z",
  "roomId": "room_102",
  "totalSeats": 60,
  "pricing": { "isFree": false, "amount": 50000 }
}
```

**Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "id": "ws_002",
    "message": "Tạo workshop thành công."
  }
}
```

### 2.2. Nhờ AI Tóm tắt file PDF giới thiệu

- **Endpoint:** `/v1/workshops/pdf-summary`
- **Method:** `POST`
- **Auth Required:** Yes (Role: Admin)
- **Content-Type:** `multipart/form-data`

**Request:** Upload file có key là `file`

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "suggestedTitle": "Kỹ năng phỏng vấn IT",
    "speakerName": "John Doe",
    "summary": "Workshop hướng dẫn sinh viên cách chuẩn bị CV và đối đáp kỹ thuật..."
  }
}
```

## 3. Dành cho Nhân sự Check-in (Staff - Mobile App)

### 3.1. Quét mã QR Check-in (Online Mode)

Dùng khi Mobile App có mạng. Bắn API trực tiếp lên server để ghi nhận check-in.

- **Endpoint:** `/v1/checkin/scan`
- **Method:** `POST`
- **Auth Required:** Yes (Role: Staff)

**Request Body:**

```json
{
  "ticketId": "TK_999",
  "workshopId": "ws_001",
  "scannedAt": "2024-05-20T07:45:12Z"
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Check-in hợp lệ. Sinh viên: Nguyễn Văn A"
}
```

**Error Responses:**

- `400 Bad Request`: `{"error": "ALREADY_CHECKED_IN", "message": "Vé này đã được check-in trước đó."}`
- `404 Not Found`: `{"error": "INVALID_TICKET", "message": "Mã vé không tồn tại hoặc sai workshop."}`

### 3.2. Đồng bộ dữ liệu Offline (Sync Mode)

Dùng khi mất mạng, App lưu log quét QR vào SQLite cục bộ. Khi có wifi, App gọi API này để bắn toàn bộ dữ liệu lên Backend.

- **Endpoint:** `/v1/checkin/sync`
- **Method:** `POST`
- **Auth Required:** Yes (Role: Staff)

**Request Body:**

```json
{
  "workshopId": "ws_001",
  "offlineRecords": [
    { "ticketId": "TK_123", "scannedAt": "2024-05-20T07:30:00Z" },
    { "ticketId": "TK_124", "scannedAt": "2024-05-20T07:31:00Z" }
  ]
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "syncedCount": 2,
    "failedCount": 0,
    "errors": []
  }
}
```

## 4. Dành cho Hệ thống (System Integration)

### 4.1. Nhận kết quả thanh toán từ Mock Gateway (Webhook)

API này không do Frontend gọi, mà do Cổng thanh toán (bên thứ 3) gọi ngược về Backend sau khi sinh viên thanh toán thành công hoặc thất bại.

- **Endpoint:** `/v1/payments/webhook`
- **Method:** `POST`
- **Auth Required:** No (Xác thực bằng chữ ký số `signature` trong payload)

**Request Body (Từ Mock Gateway gửi về):**

```json
{
  "transactionId": "GATEWAY_TXN_999888",
  "registrationId": "REG_123",
  "amount": 50000,
  "status": "SUCCESS", // hoặc "FAILED"
  "timestamp": "2024-05-20T08:15:00Z",
  "signature": "a8f9c2e4...hash_chu_ky_bao_mat..."
}
```

**Response (200 OK):**

Hệ thống luôn phải trả về 200 OK thật nhanh để Cổng thanh toán biết là đã nhận được thông tin (ACK), tránh bị gọi lại nhiều lần.

```json
{
  "status": "success",
  "message": "Webhook received successfully"
}
```

**Logic xử lý ngầm (Backend Workflow):**

- Verify signature để chống giả mạo.
- Nếu status == 'SUCCESS', update bảng payments và chuyển registrations.status thành CONFIRMED.
- Lưu mã QR vào bảng qr_codes.
- Bắn event vào bảng notification_events để worker gửi Email/App Push kèm mã QR cho sinh viên.