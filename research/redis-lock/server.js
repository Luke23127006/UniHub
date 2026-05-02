/**
 * ============================================================================
 * PoC: GIẢI QUYẾT BÀI TOÁN RACE CONDITION BẰNG REDIS DISTRIBUTED LOCK
 * ============================================================================
 * * VẤN ĐỀ (OVERBOOKING):
 * Khi 100 người dùng cùng lúc bấm mua 1 vé cuối cùng, nếu không có cơ chế khóa,
 * hệ thống có thể đọc số vé = 1 cho cả 100 người và bán ra 100 vé, làm số vé bị âm.
 *
 * * CÁCH REDIS LOCK GIẢI QUYẾT:
 * * 1. LẤY KHÓA (Acquire Lock - Dòng lệnh: SET ... NX PX 5000):
 * - "NX" (Not eXists): Cốt lõi của việc xếp hàng. Lệnh này nói với Redis rằng:
 * "Chỉ tạo cái khóa này nếu nó CHƯA TỒN TẠI". Nghĩa là trong 100 người lao vào,
 * chỉ có ĐÚNG 1 NGƯỜI tạo được khóa và đi tiếp. 99 người kia sẽ nhận kết quả `null`
 * và bị văng ra (trả về lỗi 429 - Hệ thống đang bận).
 * - "PX <TTL>" (Auto Expiry): Tự động hủy khóa sau khoảng thời gian TTL (mặc định 5 giây,
 * cấu hình qua biến môi trường LOCK_TTL_MS). Đề phòng trường hợp
 * người giữ khóa đang xử lý thì bị sập server/mất mạng, khóa vẫn sẽ tự nhả ra
 * sau TTL để không làm hệ thống bị kẹt vĩnh viễn (Deadlock).
 *
 * * 2. VÙNG AN TOÀN (Critical Section):
 * - Chỉ người cầm khóa mới lọt được vào khối `try {}` này. Trong thời gian lock
 * còn hiệu lực, code có thể kiểm tra số vé hiện tại, trừ đi 1 vé và lưu vào DB
 * mà không bị request khác xen ngang. Tuy nhiên, đây không phải an toàn tuyệt
 * đối: nếu xử lý kéo dài quá TTL thì lock có thể hết hạn trước khi xử lý
 * xong và request khác vẫn có thể lấy lock để đi tiếp.
 *
 * * 3. TRẢ KHÓA (Release Lock - Khối finally {}):
 * - Bắt buộc phải có `finally {}` để đảm bảo: Dù người đó mua thành công, mua
 * thất bại (do hết vé), hay code bị lỗi văng exception, thì khoá vẫn luôn được
 * trả lại cho những người đang đứng đợi.
 * - Khoá được giải phóng bằng Lua script (compare-and-delete): chỉ xoá khoá nếu
 * giá trị của nó khớp với token duy nhất được tạo lúc acquire. Điều này tránh việc
 * vô tình xoá khoá đã được acquire bởi một request khác khi TTL hết hạn.
 * ============================================================================
 */

const crypto = require("crypto");
const express = require("express");
const Redis = require("ioredis");

const app = express();
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

app.use(express.json());

const WORKSHOP_ID = "workshop_123";
const TICKET_KEY = `tickets:${WORKSHOP_ID}`;
const LOCK_KEY = `lock:${WORKSHOP_ID}`;
const LOCK_TTL_MS = Number(process.env.LOCK_TTL_MS || 5000);

// Lua script: atomically delete the lock only if its value matches the token
const RELEASE_LOCK_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

// API 1: Reset data for testing (Set ticket count = 1)
app.post("/reset", async (req, res) => {
  await redis.set(TICKET_KEY, 1);
  await redis.del(LOCK_KEY);
  res.json({
    message: "Reset successful: System currently has exactly 1 ticket!",
  });
});

// API 2: Fire ticket purchase request
app.post("/buy-ticket", async (req, res) => {
  // Generate a random ID to simulate different users
  const userId = req.body?.userId || `User_${Math.floor(Math.random() * 1000)}`;

  // Use a unique token per acquire so we can safely verify ownership on release
  const lockToken = crypto.randomUUID();

  // 1. Attempt to acquire the lock (Lock expires after LOCK_TTL_MS milliseconds)
  const isLocked = await redis.set(LOCK_KEY, lockToken, "NX", "PX", LOCK_TTL_MS);

  if (!isLocked) {
    return res.status(429).json({
      error: "The system is busy processing another request, please try again!",
      userId,
    });
  }

  try {
    // 2. Critical Section
    const availableTickets = await redis.get(TICKET_KEY);

    if (availableTickets === null) {
      console.log(`⚠️ [${userId}] Ticket inventory is not initialized!`);
      return res.status(503).json({
        error: "Ticket inventory is not initialized. Please reset the system first!",
        userId,
      });
    }

    if (parseInt(availableTickets, 10) > 0) {
      // Simulate server taking 50ms to process DB operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      await redis.decr(TICKET_KEY);

      console.log(`✅ [${userId}] SUCCESSFULLY PURCHASED A TICKET!`);
      return res.status(200).json({
        success: true,
        message: "Congratulations, you have successfully purchased a ticket!",
        userId,
      });
    } else {
      console.log(`❌ [${userId}] Sold out!`);
      return res.status(400).json({
        error: "Sorry, tickets are sold out!",
        userId,
      });
    }
  } finally {
    // 3. Release the lock only if we still own it (compare-and-delete via Lua)
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, 1, LOCK_KEY, lockToken);
    } catch (error) {
      console.error("Failed to release Redis lock:", {
        lockKey: LOCK_KEY,
        lockToken,
        error: error.message,
      });
    }
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(
    `Send POST requests to http://localhost:${PORT}/buy-ticket to test`,
  );
});
