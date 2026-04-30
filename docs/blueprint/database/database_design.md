# UniHub Workshop — Database Design

## Schema Overview

The database is organised into **9 logical packages**. Each package maps directly to a bounded context in the system.

| Package | Tables | Purpose |
|---|---|---|
| RBAC | `roles`, `permissions`, `role_permissions`, `users`, `user_roles` | Identity & access control |
| Authentication & Audit | `user_sessions`, `login_logs` | Session management, login audit trail |
| Student Management | `students`, `csv_sync_logs` | Student profiles synced from CSV |
| Venue & Workshop | `rooms`, `speakers`, `workshops`, `workshop_speakers` | Core event data |
| AI Summary | `workshop_documents`, `ai_summaries` | PDF upload & async AI processing |
| Registration & Payment | `registrations`, `payments`, `idempotency_keys`, `qr_codes` | Full registration lifecycle |
| Check-in | `checkins`, `offline_sync_batches` | QR scan, offline-first sync |
| Notifications | `notification_templates`, `notification_events`, `notification_logs` | Event-driven, multi-channel messaging |
| Statistics Cache | `workshop_stats_cache` | Pre-computed dashboard metrics |

---

## Architectural Decisions

### 1. RBAC Design ([UC00](../uc/UC00_DangNhapHeThong.md))

`users` → `user_roles` → `roles` → `role_permissions` → `permissions`

- Three seed roles: `student`, `organizer`, `checkin_staff`.
- Permissions are stored as `(resource, action)` pairs — e.g., `('workshop', 'create')`, `('checkin', 'scan')` — so API middleware can check them generically without hardcoded role names.
- `user_roles.assigned_by` (FK → `users.id`) records who granted the role, supporting the access audit requirement from [UC00](../uc/UC00_DangNhapHeThong.md).

### 2. Seat Contention ([UC02](../uc/UC02_DangKyWorkshop.md) — "Tranh chấp chỗ ngồi")

`workshops.available_seats` is the authoritative counter.  
At registration time, the backend issues:

```sql
UPDATE workshops
SET available_seats = available_seats - 1
WHERE id = ? AND available_seats > 0;
```

The atomic `WHERE available_seats > 0` guard at the database layer — combined with a row-level lock (`SELECT ... FOR UPDATE`) — guarantees that exactly one student gets the last seat even under concurrent load. No two rows in `registrations` can reference the same `(student_id, workshop_id)` pair (UNIQUE constraint).

### 3. Idempotency & Double-Charge Prevention ([UC02](../uc/UC02_DangKyWorkshop.md) — "Chống trừ tiền hai lần")

`idempotency_keys` table (Global API Idempotency) > The client generates a UUID before the first attempt and sends it in every retry (e.g., in the header). The server inserts it into `idempotency_keys` with `INSERT ... ON CONFLICT DO NOTHING.`

If it's a retry, the server immediately returns the cached `response_body`.

If it's new, the server processes the payment. The `payments` table does NOT need its own idempotency key; it only stores the `transaction_id` returned by the payment gateway.

This table is shared across all resource types (`resource_type`, `resource_id`) and uses a TTL (`expires_at`) to auto-clean up old keys. `payments.expires_at` marks the deadline for a pending gateway response to allow background jobs to release held seats safely.

`payments.expires_at` marks the deadline for a pending gateway response so a background job can safely release held seats after timeout.

### 4. Circuit Breaker Support ([UC02](../uc/UC02_DangKyWorkshop.md) — "Cổng thanh toán không ổn định")

The `payments` table captures:
- `status = 'pending'` when the gateway call is in-flight.
- `payload_request` / `payload_response` for full observability.
- `expires_at` so a sweeper job can detect timed-out payments and roll back the seat reservation without leaving zombie records.

The `registrations.status` field drives graceful degradation: a registration in `pending_payment` state keeps the seat reserved temporarily; on confirmed payment it transitions to `confirmed` and the QR code is generated. It can also transition to `cancelled` if the admin cancels the workshop.

### 5. Offline Check-in & Sync ([UC06](../uc/UC06_QuetMaQRCheckIn.md) — "Check-in offline")

`checkins.is_offline = TRUE` flags records that originated on the device while offline.
`checkins.client_timestamp` preserves the on-device time so the audit trail is accurate even after a delayed sync.
`checkins.scanned_by_user_id` (FK → users.id) records exactly which staff member scanned the QR code, ensuring a complete audit trail for security and fraud prevention.
`offline_sync_batches` stores the raw batch payload from the mobile device, along with per-record counters (`synced_records`, `failed_records`), so partial failures are visible and retryable.
`checkins` has a UNIQUE constraint on `registration_id` to prevent duplicate check-ins when the same batch is submitted more than once during sync.

### 6. CSV Student Sync ([UC07](../uc/UC07_DongBoDuLieuSinhVien.md) — "Đồng bộ dữ liệu")

`csv_sync_logs` records every import job. Each run is isolated:
- `total_rows` / `processed_rows` / `skipped_rows` / `error_rows` give an at-a-glance health check.
- `error_details` (TEXT) stores JSON-serialised per-row errors so ops staff can replay bad rows without re-running the full file.

`students` uses `student_code` as the natural key for upsert (`INSERT ... ON CONFLICT (student_code) DO UPDATE ...`). `students.user_id` is nullable until the student performs their first login, at which point a `users` record is created and linked.

### 7. AI Summary Pipeline ([UC05](../uc/UC05_TaoTomTatAI.md))

`workshop_documents.upload_status` and `ai_summaries.status` model the two-stage async pipeline:

1. File uploaded → `upload_status = 'uploaded'`
2. Text extraction job picks it up → `upload_status = 'processing'`
3. AI API call queued → `ai_summaries.status = 'pending'`
4. API responds → `status = 'completed'` and `summary_text` is populated.

`ai_summaries.retry_count` together with `last_error` supports exponential-backoff retry without polling. A background worker increments the counter on each failure and backs off before the next attempt.

### 8. Notification Architecture ([UC08](../uc/UC08_GuiThongBao.md))

`notification_templates` decouples message format from delivery logic — adding a Telegram channel requires only a new template row and a new worker consumer, not code changes in business logic.

`notification_events` is the durable queue record: workers pick up `status = 'queued'` rows, flip to `'processing'`, and write outcome to `notification_logs`. `next_retry_at` implements back-off retry. `related_entity_type` + `related_entity_id` allow any entity (workshop, payment, etc.) to trigger notifications without coupling.

### 9. Statistics Cache ([UC04](../uc/UC04_XemThongKe.md))

`workshop_stats_cache` is a materialised summary table refreshed by a background cron job. It prevents full-scan aggregation queries during peak load. `last_refreshed_at` tells the frontend how stale the data is. For real-time seat counts, the frontend reads `workshops.available_seats` directly (kept hot in Redis in the production design).

### 10. Workshop Scheduling & Lifecycle ([UC03](../uc/UC03_QuanLyWorkshop.md))

Scheduling Constraints:
workshops table explicitly requires `room_id`, `start_time`, and `end_time`. The backend API enforces scheduling rules by querying these fields to prevent double-booking a room (`WHERE room_id = ? AND (start_time < ? AND end_time > ?)`).

Cancellation Lifecycle:
Workshops do not use hard deletes. workshops.status (`DRAFT`, `PUBLISHED`, `CANCELLED`) manages visibility. If a workshop is cancelled, `registrations.status` is updated to `cancelled` to trigger the refund/notification pipeline without losing historical financial or registration data.

---

## Key Constraints Summary

| Table | Constraint | Purpose |
|---|---|---|
| `users` | UNIQUE `email` | One account per email |
| `students` | UNIQUE `student_code` | Upsert anchor for CSV sync |
| `students` | UNIQUE `user_id` | 1:1 with users |
| `permissions` | UNIQUE `(resource, action)` | No duplicate permission pairs |
| `workshops` | CHECK `available_seats >= 0` | No negative seat count |
| `registrations` | UNIQUE `(student_id, workshop_id)` | One registration per student per workshop |
| `idempotency_keys` | UNIQUE `key_hash` | Idempotency lookup |
| `qr_codes` | UNIQUE `code` | QR token uniqueness |
| `qr_codes` | UNIQUE `registration_id` | One QR per registration |
| `checkins` | UNIQUE `registration_id` | One check-in per registration |
| `workshop_stats_cache` | UNIQUE `workshop_id` | One cache row per workshop |
