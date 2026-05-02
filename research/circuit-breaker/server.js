// server.js
const express = require('express');
const axios = require('axios');
const CircuitBreaker = require('./CircuitBreaker');

const app = express();
const PORT = 3000;

// ==========================================
// 1. MOCK PAYMENT GATEWAY (Hệ thống bên ngoài)
// ==========================================
let isPaymentGatewayDown = false; // Biến cờ để bật/tắt lỗi mock

app.post('/api/mock-payment', (req, res) => {
    if (isPaymentGatewayDown) {
        return res.status(503).json({ error: 'Service Unavailable', message: 'Cổng thanh toán đang bảo trì' });
    }
    return res.status(200).json({ status: 'SUCCESS', transaction_id: 'TXN12345' });
});

// Endpoint phụ để bạn thay đổi trạng thái của cổng thanh toán khi test
app.post('/api/toggle-payment-gateway', (req, res) => {
    const { state } = req.query;

    if (state !== 'up' && state !== 'down') {
        return res.status(400).json({
            error: 'Invalid state',
            message: 'Vui lòng truyền ?state=up hoặc ?state=down'
        });
    }

    isPaymentGatewayDown = state === 'down';
    return res.json({
        message: `Cổng thanh toán hiện tại đang: ${isPaymentGatewayDown ? 'LỖI (DOWN)' : 'BÌNH THƯỜNG (UP)'}`,
        state: isPaymentGatewayDown ? 'down' : 'up'
    });
});

// ==========================================
// 2. UNIHUB BACKEND (Tích hợp Circuit Breaker)
// ==========================================

// Hàm bọc logic gọi API thanh toán
const callPaymentAPI = async () => {
    const response = await axios.post(`http://localhost:${PORT}/api/mock-payment`);
    return response.data;
};

// Khởi tạo Circuit Breaker cho việc gọi thanh toán (Ngưỡng: 3 lần, Timeout: 10 giây)
const paymentCircuitBreaker = new CircuitBreaker(callPaymentAPI, {
    failureThreshold: 3,
    resetTimeout: 10000
});

app.post('/checkout', async (req, res) => {
    try {
        console.log('\n--- Nhận request thanh toán mới ---');
        // Thay vì gọi trực tiếp axios.post, ta gọi qua CircuitBreaker.fire()
        const result = await paymentCircuitBreaker.fire();
        res.status(200).json({ message: 'Thanh toán thành công!', data: result });
    } catch (error) {
        // Trả về lỗi thân thiện cho user / App
        res.status(500).json({
            message: 'Thanh toán thất bại.',
            reason: error.response?.data?.message || error.message || 'Lỗi không xác định'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 PoC Server is running on http://localhost:${PORT}`);
});