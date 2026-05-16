/**
 * Script to generate a test JWT and an HTML file with the QR code.
 * Usage: node generate-test-qr.js [ticketId] [workshopId]
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Change this to match your JWT_ACCESS_SECRET or QR_SECRET in .env
const SECRET = "unihub-qr-secret";

const args = process.argv.slice(2);
const tid = args[0] || "1";
const wid = args[1] || "1";

const payload = {
  tid: tid,
  uid: "std_99",
  wid: wid,
  name: "Nguyen Van Test",
  iat: Math.floor(Date.now() / 1000)
};

const token = jwt.sign(payload, SECRET);

// Create HTML content with a QR code image using a public API
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>UniHub Test QR</title>
    <style>
        body { 
          font-family: 'Inter', -apple-system, sans-serif; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          background: #0f172a; 
          color: white; 
          margin: 0;
        }
        .card { 
          background: #1e293b; 
          padding: 2.5rem; 
          border-radius: 1.5rem; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.5); 
          text-align: center; 
          max-width: 450px;
          border: 1px solid #334155;
        }
        h2 { color: #38bdf8; margin-top: 0; }
        .qr-container {
          background: white; 
          padding: 15px; 
          border-radius: 1rem; 
          display: inline-block;
          margin: 20px 0;
        }
        img { display: block; }
        .info { font-size: 0.9rem; color: #94a3b8; margin-bottom: 20px; }
        .token-box { 
          background: #000; 
          padding: 12px; 
          display: block; 
          word-break: break-all; 
          font-size: 0.75rem; 
          border-radius: 8px; 
          color: #7dd3fc;
          font-family: monospace;
          text-align: left;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>UniHub QR Scanner Test</h2>
        <div class="info">
          Workshop ID: <b style="color:white">${wid}</b><br/>
          Ticket ID: <b style="color:white">${tid}</b>
        </div>
        <div class="qr-container">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${token}" alt="QR Code" />
        </div>
        <p style="font-size: 0.8rem; margin-bottom: 5px;">JWT Token Payload:</p>
        <div class="token-box">${token}</div>
    </div>
</body>
</html>
`;

const filePath = path.join(__dirname, 'test-qr.html');
fs.writeFileSync(filePath, htmlContent);

console.log("\n" + "=".repeat(40));
console.log("✅ ĐÃ TẠO FILE TEST QR THÀNH CÔNG!");
console.log("👉 File: " + filePath);
console.log("👉 Hướng dẫn: Mở file này bằng trình duyệt và dùng App quét mã.");
console.log("=".repeat(40) + "\n");
