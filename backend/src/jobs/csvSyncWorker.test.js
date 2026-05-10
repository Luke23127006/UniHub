/**
 * Integration test for csvSyncWorker
 *
 * Runs the full worker pipeline against a small generated CSV and
 * verifies the database state afterwards. Requires a live DATABASE_URL.
 *
 * Usage:
 *   node src/jobs/csvSyncWorker.test.js
 *
 * Exit code 0 = all assertions passed
 * Exit code 1 = one or more assertions failed
 */

"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const prisma = require("../config/db");

// ── Tiny assertion helper ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function assertEqual(label, actual, expected) {
  const ok = actual === expected;
  assert(label, ok, ok ? "" : `expected ${expected}, got ${actual}`);
}

// ── CSV fixture builder ───────────────────────────────────────────────────────

/**
 * Writes a small, fully-controlled CSV to a temp file and returns the path.
 * Rows are chosen to exercise every code path:
 *   - Normal rows (unique MSSV, complete data)          → upserted
 *   - Duplicate row  (same MSSV as row 1, updated name) → upserted / overwrite
 *   - Blank MSSV row                                    → skipped
 */
function buildFixtureCsv(filePath) {
  const rows = [
    "MSSV,Họ và Tên,Email",
    // 10 normal students
    "2021100001,Nguyễn Văn An,an.0001@student.edu.vn",
    "2021100002,Trần Thị Bình,binh.0002@student.edu.vn",
    "2021100003,Lê Minh Chi,chi.0003@student.edu.vn",
    "2021100004,Phạm Quốc Dũng,dung.0004@student.edu.vn",
    "2021100005,Hoàng Thị Em,em.0005@student.edu.vn",
    "2021100006,Vũ Anh Giang,giang.0006@student.edu.vn",
    "2021100007,Đặng Văn Hùng,hung.0007@student.edu.vn",
    "2021100008,Bùi Thị Kim,kim.0008@student.edu.vn",
    "2021100009,Hồ Minh Lan,lan.0009@student.edu.vn",
    "2021100010,Ngô Văn Long,long.0010@student.edu.vn",
    // Duplicate MSSV — name and email updated
    "2021100001,Nguyễn Văn An (Updated),updated.an@student.edu.vn",
    // Blank MSSV — must be skipped, not crash
    ",Không Có MSSV,no_mssv@test.com",
  ];
  fs.writeFileSync(filePath, rows.join("\n"), "utf-8");
}

// ── Test suites ───────────────────────────────────────────────────────────────

async function testNormalSync(csvPath) {
  console.log("\n[Suite] Normal sync — 10 unique + 1 duplicate + 1 blank");

  // Clean slate: remove any students whose codes are in our fixture.
  const fixtureCodes = Array.from({ length: 10 }, (_, i) =>
    String(2021100001 + i)
  );
  await prisma.student.deleteMany({
    where: { student_code: { in: fixtureCodes } },
  });

  const workerPath = path.resolve(__dirname, "csvSyncWorker.js");
  let stdout = "";
  let spawnError = null;

  try {
    stdout = execSync(`node "${workerPath}" "${csvPath}"`, {
      encoding: "utf-8",
      env: process.env,
    });
    console.log(stdout.trimEnd());
  } catch (err) {
    spawnError = err;
    console.error(err.stderr || err.message);
  }

  assert("Worker exited without error", spawnError === null);

  // ── DB state assertions ───────────────────────────────────────────────────

  const students = await prisma.student.findMany({
    where: { student_code: { in: fixtureCodes } },
    orderBy: { student_code: "asc" },
  });

  assertEqual("Correct number of student records in DB", students.length, 10);

  const student1 = students.find((s) => s.student_code === "2021100001");
  assert("Student record exists for MSSV 2021100001", student1 != null);
  assertEqual(
    "Upsert updated full_name for duplicate MSSV",
    student1?.full_name,
    "Nguyễn Văn An (Updated)"
  );
  assertEqual(
    "Upsert updated email for duplicate MSSV",
    student1?.email,
    "updated.an@student.edu.vn"
  );

  const blankStudent = await prisma.student.findFirst({
    where: { student_code: "" },
  });
  assert("Blank MSSV row was NOT inserted", blankStudent === null);

  // ── CsvSyncLog assertions ─────────────────────────────────────────────────

  const syncLog = await prisma.csvSyncLog.findFirst({
    where: { file_name: path.basename(csvPath) },
    orderBy: { created_at: "desc" },
  });

  assert("CsvSyncLog record was created", syncLog != null);
  assertEqual("CsvSyncLog status is completed", syncLog?.status, "completed");
  assertEqual("CsvSyncLog total_rows = 12", syncLog?.total_rows, 12);
  assertEqual("CsvSyncLog processed_rows = 11", syncLog?.processed_rows, 11);
  assertEqual("CsvSyncLog skipped_rows = 1", syncLog?.skipped_rows, 1);
  assert("CsvSyncLog completed_at is set", syncLog?.completed_at != null);
}

async function testIdempotency(csvPath) {
  console.log("\n[Suite] Idempotency — running worker twice produces same state");

  const workerPath = path.resolve(__dirname, "csvSyncWorker.js");

  execSync(`node "${workerPath}" "${csvPath}"`, {
    encoding: "utf-8",
    env: process.env,
  });

  const fixtureCodes = Array.from({ length: 10 }, (_, i) =>
    String(2021100001 + i)
  );
  const students = await prisma.student.findMany({
    where: { student_code: { in: fixtureCodes } },
  });

  assertEqual(
    "Re-run does not create duplicate records",
    students.length,
    10
  );
}

async function testMissingFile() {
  console.log("\n[Suite] Missing file — worker exits with code 1");

  const workerPath = path.resolve(__dirname, "csvSyncWorker.js");
  let exitCode = 0;

  try {
    execSync(`node "${workerPath}" "data/nonexistent_file.csv"`, {
      encoding: "utf-8",
      env: process.env,
    });
  } catch (err) {
    exitCode = err.status ?? 1;
  }

  assertEqual("Exit code is 1 for missing file", exitCode, 1);
}

async function testLargeCsv() {
  console.log("\n[Suite] Large CSV — worker processes 10,500 rows < 60s");

  const largeCsvPath = path.resolve("data/students_test.csv");
  if (!fs.existsSync(largeCsvPath)) {
    console.log(
      "  ⚠  data/students_test.csv not found — skipping large CSV test.\n" +
        "     Run: python data/generate_students_csv.py"
    );
    return;
  }

  const workerPath = path.resolve(__dirname, "csvSyncWorker.js");
  const t0 = Date.now();
  let spawnError = null;

  try {
    const out = execSync(`node "${workerPath}" "${largeCsvPath}"`, {
      encoding: "utf-8",
      env: process.env,
      timeout: 120_000,
    });
    console.log(out.trimEnd());
  } catch (err) {
    spawnError = err;
    console.error(err.stderr || err.message);
  }

  const elapsedSec = (Date.now() - t0) / 1000;

  assert("Worker completed without error", spawnError === null);
  assert(
    `Total time under 60s (actual: ${elapsedSec.toFixed(1)}s)`,
    elapsedSec < 60
  );

  const syncLog = await prisma.csvSyncLog.findFirst({
    where: { file_name: "students_test.csv" },
    orderBy: { created_at: "desc" },
  });
  assertEqual(
    "CsvSyncLog status is completed",
    syncLog?.status,
    "completed"
  );
  assert(
    "CsvSyncLog processed_rows > 10000",
    (syncLog?.processed_rows ?? 0) > 10_000
  );
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  csvSyncWorker — Integration Test Suite");
  console.log("═══════════════════════════════════════════════");

  const fixturePath = path.resolve("data/fixture_test.csv");

  try {
    // Ensure data/ directory exists
    fs.mkdirSync("data", { recursive: true });

    buildFixtureCsv(fixturePath);

    await testNormalSync(fixturePath);
    await testIdempotency(fixturePath);
    await testMissingFile();
    await testLargeCsv();
  } catch (err) {
    console.error("\nUnexpected test runner error:", err);
    failed++;
  } finally {
    // Cleanup fixture file
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);

    await prisma.$disconnect();

    console.log("\n═══════════════════════════════════════════════");
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════════════\n");

    process.exit(failed > 0 ? 1 : 0);
  }
}

main();
