/**
 * Generates a deterministic 20,000-row student CSV for UC07 spec testing.
 *
 * Layout (positions are 1-based data rows, excluding header):
 *   - 19,995 valid rows
 *   - 5 intentionally bad rows at fixed positions (1000, 5000, 8000, 12000, 16000):
 *       rows 1000, 8000, 16000 → invalid email format
 *       rows 5000, 12000      → blank MSSV
 *
 * Output: data/students_spec.csv
 *
 * Usage (from backend/ directory):
 *   node data/generate_spec_csv.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const OUT_PATH = path.resolve(__dirname, "students_spec.csv");
const TOTAL_ROWS = 20_000;

// Bad row positions (1-based)
const BAD_EMAIL_ROWS = new Set([1000, 8000, 16000]);
const BLANK_MSSV_ROWS = new Set([5000, 12000]);

const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ"];
const DEM = ["Thị", "Văn", "Minh", "Quốc", "Anh", "Tuấn", "Hữu", "Thành", "Ngọc", ""];
const TEN = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Hùng", "Khoa", "Lan", "Linh",
             "Mai", "Nam", "Phong", "Quân", "Sơn", "Tâm", "Thảo", "Uyên", "Việt", "Yến"];

function name(i) {
  const ho  = HO[i % HO.length];
  const dem = DEM[Math.floor(i / HO.length) % DEM.length];
  const ten = TEN[Math.floor(i / (HO.length * DEM.length)) % TEN.length];
  return dem ? `${ho} ${dem} ${ten}` : `${ho} ${ten}`;
}

function mssv(i) {
  const year = 2019 + (i % 6);
  const seq  = String(100000 + i).padStart(6, "0");
  return `${year}${seq}`;
}

function email(i) {
  return `sv${String(i).padStart(6, "0")}@uni.edu.vn`;
}

const t0 = Date.now();
const lines = ["MSSV,Họ và Tên,Email"];
let badCount = 0;

for (let row = 1; row <= TOTAL_ROWS; row++) {
  if (BAD_EMAIL_ROWS.has(row)) {
    // Invalid email — no @ symbol
    lines.push(`${mssv(row)},${name(row)},INVALID_EMAIL_FORMAT`);
    badCount++;
  } else if (BLANK_MSSV_ROWS.has(row)) {
    // Blank MSSV
    lines.push(`,${name(row)},${email(row)}`);
    badCount++;
  } else {
    lines.push(`${mssv(row)},${name(row)},${email(row)}`);
  }
}

fs.writeFileSync(OUT_PATH, lines.join("\n"), "utf-8");

const kb = (fs.statSync(OUT_PATH).size / 1024).toFixed(1);
const ms = Date.now() - t0;

console.log(`[Generate] ✓ ${OUT_PATH}`);
console.log(`[Generate]   Total rows : ${TOTAL_ROWS.toLocaleString()}  (+ 1 header)`);
console.log(`[Generate]   Valid rows : ${(TOTAL_ROWS - badCount).toLocaleString()}`);
console.log(`[Generate]   Bad rows   : ${badCount}  (at positions 1000, 5000, 8000, 12000, 16000)`);
console.log(`[Generate]   File size  : ${kb} KB`);
console.log(`[Generate]   Generated  : ${ms}ms`);
