const express = require('express');
const app = express();
const PORT = 4000;

app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[MockGateway] ${req.method} ${req.url}`);
  next();
});

// Mock Initiate Payment
app.post('/payments/initiate', (req, res) => {
  const { registrationId, amount } = req.body;
  console.log(`[MockGateway] Initiating payment for RegID: ${registrationId}, Amount: ${amount}`);
  res.json({ 
    success: true, 
    paymentUrl: `http://localhost:5173/checkout/${registrationId}` 
  });
});

// Mock Verify Payment
app.get('/payments/verify/:id', (req, res) => {
  const { id } = req.params;
  console.log(`[MockGateway] Verifying payment for RegID: ${id}`);
  // In a real mock, we might track which IDs are "paid"
  // For now, let's just return success for anything to unblock the flow
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock Payment Gateway running on http://0.0.0.0:${PORT}`);
});
