/**
 * CSV Student Sync Worker
 *
 * Streams a large CSV file and upserts student records in batches.
 * Designed to handle 10,000+ rows without OOM by never loading the
 * full file into memory.
 *
 * Usage:
 *   node src/jobs/csvSyncWorker.js <path-to-csv>
 *
 * Expected CSV columns: MSSV | Họ và Tên | Email
 */

"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const prisma = require("../config/db");

// ── Constants ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Wraps a csv-parser ReadStream in an async iterable so we can use
 * `for await...of`, which automatically handles backpressure: the
 * stream pauses whenever the loop body is awaiting a DB write, so
 * parsed rows are never queued in RAM while the DB is busy.
 */
function createCsvStream(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const parser = fileStream.pipe(
    csv({
      mapHeaders: ({ header }) => header.trim(),
    })
  );

  // Surface file-level and parse-level errors as rejected promises on
  // the async iterator so they are caught by the surrounding try/catch.
  let streamError = null;
  fileStream.on("error", (err) => {
    streamError = err;
    parser.destroy(err);
  });
  parser.on("error", (err) => {
    streamError = err;
  });

  return { parser, getError: () => streamError };
}

/**
 * Flushes a batch of parsed rows to the database using a single
 * transaction. Each student is upserted by student_code so re-running
 * the worker on the same file is safe.
 * Returns { inserted, updated } counts for logging.
 */
async function flushBatch(batch) {
  // Pre-check which codes already exist so we can log inserted vs updated.
  const codes = batch.map((r) => (r["MSSV"] || "").trim());
  const existing = await prisma.student.findMany({
    where: { student_code: { in: codes } },
    select: { student_code: true },
  });
  const existingSet = new Set(existing.map((s) => s.student_code));

  await prisma.$transaction(
    batch.map((row) => {
      const student_code = (row["MSSV"] || "").trim();
      const full_name = (row["Họ và Tên"] || "").trim();
      const email = (row["Email"] || "").trim();

      return prisma.student.upsert({
        where: { student_code },
        create: { student_code, full_name, email, synced_at: new Date() },
        update: { full_name, email, synced_at: new Date() },
      });
    })
  );

  let inserted = 0;
  let updated = 0;
  for (const row of batch) {
    const code = (row["MSSV"] || "").trim();
    const name = (row["Họ và Tên"] || "").trim();
    if (existingSet.has(code)) {
      console.log(`[CSV Sync]   ↺  UPDATED   MSSV=${code}  name="${name}"`);
      updated++;
    } else {
      console.log(`[CSV Sync]   ✓  INSERTED  MSSV=${code}  name="${name}"`);
      inserted++;
    }
  }
  return { inserted, updated };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node src/jobs/csvSyncWorker.js <path-to-csv>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const fileName = path.basename(resolvedPath);
  const startTime = Date.now();

  console.log(`[CSV Sync] Starting — file: ${fileName}`);

  let syncLog;
  let totalRows = 0;
  let processedRows = 0;
  let insertedRows = 0;
  let updatedRows = 0;
  let errorRows = 0;
  const errorDetails = [];
  const MAX_ERROR_DETAILS = 100;

  try {
    syncLog = await prisma.csvSyncLog.create({
      data: {
        file_name: fileName,
        file_path: resolvedPath,
        status: "processing",
        started_at: new Date(),
      },
    });
    const { parser, getError } = createCsvStream(resolvedPath);
    let batch = [];

    for await (const row of parser) {
      totalRows++;

      const student_code = (row["MSSV"] || "").trim();
      const email = (row["Email"] || "").trim();
      const full_name = (row["Họ và Tên"] || "").trim();

      // ── Validation ──────────────────────────────────────────────────────
      if (!student_code) {
        errorRows++;
        const msg = `Row ${totalRows}: ⚠  SKIPPED — missing MSSV (name: "${full_name}", email: "${email}")`;
        console.warn(`[CSV Sync] ${msg}`);
        if (errorDetails.length < MAX_ERROR_DETAILS) errorDetails.push(msg);
        continue;
      }

      if (!EMAIL_REGEX.test(email)) {
        errorRows++;
        const msg = `Row ${totalRows}: ⚠  SKIPPED — invalid email format (MSSV: "${student_code}", email: "${email}")`;
        console.warn(`[CSV Sync] ${msg}`);
        if (errorDetails.length < MAX_ERROR_DETAILS) errorDetails.push(msg);
        continue;
      }

      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        const { inserted, updated } = await flushBatch(batch);
        processedRows += batch.length;
        insertedRows += inserted;
        updatedRows += updated;
        batch = [];
        console.log(`[CSV Sync] Batch flushed — processed so far: ${processedRows}`);
      }
    }

    // Re-throw any stream-level error that was swallowed by the iterator.
    const streamErr = getError();
    if (streamErr) throw streamErr;

    // Flush the final partial batch (< BATCH_SIZE rows).
    if (batch.length > 0) {
      const { inserted, updated } = await flushBatch(batch);
      processedRows += batch.length;
      insertedRows += inserted;
      updatedRows += updated;
    }

    const elapsedMs = Date.now() - startTime;
    const elapsedSec = (elapsedMs / 1000).toFixed(2);

    console.log('');
    console.log(`[CSV Sync] ════════════════════════════════════════`);
    console.log(`[CSV Sync] ✅  Import complete in ${elapsedSec}s`);
    console.log(`[CSV Sync]    Total rows read  : ${totalRows}`);
    console.log(`[CSV Sync]    ✓  Inserted      : ${insertedRows} new students`);
    console.log(`[CSV Sync]    ↺  Updated       : ${updatedRows} existing students`);
    console.log(`[CSV Sync]    ⚠  Skipped       : ${errorRows} invalid rows`);
    console.log(`[CSV Sync] ════════════════════════════════════════`);

    await prisma.csvSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "completed",
        total_rows: totalRows,
        processed_rows: processedRows,
        skipped_rows: errorRows,
        error_rows: errorRows,
        error_details: errorDetails.length > 0 ? errorDetails.join("\n") : null,
        completed_at: new Date(),
      },
    });
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[CSV Sync] Fatal error after ${elapsedMs}ms:`, err.message);

    if (syncLog) {
      await prisma.csvSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          total_rows: totalRows,
          processed_rows: processedRows,
          error_rows: errorRows,
          error_details: err.message,
          completed_at: new Date(),
        },
      });
    }

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

// ── Entry points ───────────────────────────────────────────────────────────

if (require.main === module) {
  // CLI: node src/jobs/csvSyncWorker.js <path-to-csv>
  run();
} else {
  // Required by server.js — export a scheduler function.
  const cron    = require('node-cron');
  const redlock = require('../config/redlock');

  const CRON_SCHEDULE   = process.env.CSV_SYNC_CRON || '0 2 * * *';
  const JOB_LOCK_KEY    = 'lock:jobs:csvSync';
  const JOB_LOCK_TTL_MS = 10 * 60 * 1000;

  async function runWithLock() {
    let lock;
    try {
      lock = await redlock.acquire([JOB_LOCK_KEY], JOB_LOCK_TTL_MS);
    } catch {
      console.log('[CSV Sync Job] Another instance is already running — skipping.');
      return;
    }
    try {
      console.log(`[CSV Sync Job] ⏰ Cron fired at ${new Date().toLocaleTimeString('vi-VN')}`);
      // Override argv so run() picks up the configured file path
      process.argv[2] = process.env.CSV_SYNC_FILE || path.resolve(__dirname, '../../data/students_spec.csv');
      await run();
    } finally {
      try { await lock.release(); } catch { /* ignore */ }
    }
  }

  function startCsvSyncJob() {
    cron.schedule(CRON_SCHEDULE, runWithLock);
    const label = CRON_SCHEDULE === '0 2 * * *'
      ? 'daily at 02:00 AM'
      : `on schedule: ${CRON_SCHEDULE}`;
    console.log(`[CSV Sync Job] Scheduled — ${label}`);
  }

  module.exports = { startCsvSyncJob };
}
