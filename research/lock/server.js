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
 * - "PX 5000" (Auto Expiry): Tự động hủy khóa sau 5 giây. Đề phòng trường hợp
 * người giữ khóa đang xử lý thì bị sập server/mất mạng, khóa vẫn sẽ tự nhả ra
 * sau 5 giây để không làm hệ thống bị kẹt vĩnh viễn (Deadlock).
 *
 * * 2. VÙNG AN TOÀN (Critical Section):
 * - Chỉ người cầm khóa mới lọt được vào khối `try {}` này. Tại đây, code có thể
 * thong thả kiểm tra số vé hiện tại, trừ đi 1 vé và lưu vào DB một cách an toàn
 * tuyệt đối mà không sợ bất kỳ request nào khác xen ngang phá bĩnh.
 *
 * * 3. TRẢ KHÓA (Release Lock - Khối finally {}):
 * - Bắt buộc phải có `finally {}` để đảm bảo: Dù người đó mua thành công, mua
 * thất bại (do hết vé), hay code bị lỗi văng exception, thì lệnh `redis.del(LOCK_KEY)`
 * vẫn luôn được gọi để trả lại chìa khóa cho những người đang đứng đợi.
 * ============================================================================
 */

const express = require("express");
const Redis = require("ioredis");

const app = express();
const redis = new Redis({ host: "localhost", port: 6379 });

app.use(express.json());

const WORKSHOP_ID = "workshop_123";
const TICKET_KEY = `tickets:${WORKSHOP_ID}`;
const LOCK_KEY = `lock:${WORKSHOP_ID}`;

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

  // 1. Attempt to acquire the lock (Lock expires in 5 seconds)
  const isLocked = await redis.set(LOCK_KEY, userId, "NX", "PX", 5000);

  if (!isLocked) {
    return res.status(429).json({
      error: "The system is busy processing another request, please try again!",
      userId,
    });
  }

  try {
    // 2. Critical Section
    const availableTickets = await redis.get(TICKET_KEY);

    if (parseInt(availableTickets) > 0) {
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
    // 3. Release the lock when done
    await redis.del(LOCK_KEY);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log(
    `Send POST requests to http://localhost:${PORT}/buy-ticket to test`,
  );
});
