// CircuitBreaker.js

class CircuitBreaker {
  constructor(requestFunction, options = {}) {
    this.requestFunction = requestFunction; // Hàm gọi API thực tế
    this.failureThreshold = options.failureThreshold || 3; // Ngắt sau 3 lần lỗi
    this.resetTimeout = options.resetTimeout || 10000; // Thời gian chờ (10 giây) chuyển sang Half-Open

    this.state = "CLOSED"; // Trạng thái ban đầu
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  async fire(...args) {
    if (this.state === "OPEN") {
      if (Date.now() > this.nextAttempt) {
        // Hết thời gian chờ, chuyển sang thăm dò
        this.state = "HALF_OPEN";
        console.log(
          "[Circuit Breaker] Trạng thái chuyển sang HALF_OPEN - Đang thăm dò...",
        );
      } else {
        // Vẫn trong thời gian khóa mạch, trả về lỗi ngay lập tức (Fast fail)
        throw new Error(
          "CircuitBreaker is OPEN. Payment Gateway is currently unreachable. Fast failing.",
        );
      }
    } else if (this.state === "HALF_OPEN") {
      throw new Error(
        "CircuitBreaker is HALF_OPEN. Awaiting probe result. Fast failing.",
      );
    }

    try {
      // Thực hiện gọi API
      const response = await this.requestFunction(...args);
      return this.onSuccess(response);
    } catch (error) {
      return this.onFailure(error);
    }
  }

  onSuccess(response) {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      console.log(
        "[Circuit Breaker] Thăm dò thành công! Trạng thái chuyển về CLOSED.",
      );
      this.state = "CLOSED";
    }
    return response;
  }

  onFailure(error) {
    this.failureCount += 1;
    console.log(
      `[Circuit Breaker] Lỗi lần thứ ${this.failureCount}: ${error.message}`,
    );

    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(
        `[Circuit Breaker] Số lần lỗi vượt ngưỡng (${this.failureThreshold}). Mạch đã OPEN! Khóa trong ${this.resetTimeout / 1000}s.`,
      );
    }

    throw error;
  }
}

module.exports = CircuitBreaker;
