const express = require('express');
const app = express();
const PORT = 4000;

app.use(express.json());

// Mock Initiate Payment
app.post('/payments/initiate', (req, res) => {
  const { registrationId, amount } = req.body;
  res.json({
    success: true,
    paymentUrl: `http://localhost:5173/checkout/${registrationId}`
  });
});

// Mock Verify Payment
app.get('/payments/verify/:id', (req, res) => {
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock Payment Gateway running on http://0.0.0.0:${PORT}`);
});
