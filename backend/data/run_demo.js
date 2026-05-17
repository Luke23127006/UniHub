/**
 * Demo runner for Clip 4 — CSV Batch Sync
 *
 * 1. Seeds students 2024001001 and 2024001002 so the worker
 *    shows "UPDATED" (duplicate handling) for those rows.
 * 2. Runs csvSyncWorker against demo_import.csv.
 *
 * Usage (from backend/ directory):
 *   node data/run_demo.js
 */
"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const { execSync } = require("child_process");
const path = require("path");
const prisma = require("../src/config/db");

async function main() {
  // ── Step 1: Seed existing duplicates ──────────────────────────────────────
  console.log("[Demo] Step 1: Pre-seeding 2 students that already exist in DB...");
  await prisma.student.upsert({
    where: { student_code: "2024001001" },
    create: { student_code: "2024001001", full_name: "Nguyễn Thị Ánh", email: "anh.nguyen@student.edu.vn", synced_at: new Date() },
    update: { full_name: "Nguyễn Thị Ánh", email: "anh.nguyen@student.edu.vn", synced_at: new Date() },
  });
  await prisma.student.upsert({
    where: { student_code: "2024001002" },
    create: { student_code: "2024001002", full_name: "Trần Minh Khoa", email: "khoa.tran@student.edu.vn", synced_at: new Date() },
    update: { full_name: "Trần Minh Khoa", email: "khoa.tran@student.edu.vn", synced_at: new Date() },
  });
  console.log("[Demo]   ✓ MSSV 2024001001 — Nguyễn Thị Ánh  (already in DB)");
  console.log("[Demo]   ✓ MSSV 2024001002 — Trần Minh Khoa   (already in DB)");
  console.log("");

  await prisma.$disconnect();

  // ── Step 2: Run the CSV worker ─────────────────────────────────────────────
  console.log("[Demo] Step 2: Triggering CSV import (demo_import.csv)...");
  console.log("[Demo]   CSV contains:");
  console.log("[Demo]     • 5 valid new students");
  console.log("[Demo]     • 1 row with invalid email format  → SKIPPED");
  console.log("[Demo]     • 1 row with missing MSSV          → SKIPPED");
  console.log("[Demo]     • 2 rows duplicating existing MSSV → UPDATED");
  console.log("");

  const workerPath = path.resolve(__dirname, "../src/jobs/csvSyncWorker.js");
  const csvPath = path.resolve(__dirname, "demo_import.csv");

  execSync(`node "${workerPath}" "${csvPath}"`, {
    stdio: "inherit",
    env: process.env,
  });

  console.log("");
  console.log("[Demo] System remained stable throughout import. Demo complete.");
}

main().catch((err) => {
  console.error("[Demo] Unexpected error:", err.message);
  process.exit(1);
});
