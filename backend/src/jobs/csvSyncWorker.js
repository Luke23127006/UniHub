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
 */
async function flushBatch(batch) {
  await prisma.$transaction(
    batch.map((row) => {
      const student_code = (row["MSSV"] || "").trim();
      const full_name = (row["Họ và Tên"] || "").trim();
      const email = (row["Email"] || "").trim();

      return prisma.student.upsert({
        where: { student_code },
        create: {
          student_code,
          full_name,
          email,
          synced_at: new Date(),
        },
        update: {
          full_name,
          email,
          synced_at: new Date(),
        },
      });
    })
  );
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

  // Create an audit record so admins can track every sync run.
  const syncLog = await prisma.csvSyncLog.create({
    data: {
      file_name: fileName,
      file_path: resolvedPath,
      status: "processing",
      started_at: new Date(),
    },
  });

  let totalRows = 0;
  let processedRows = 0;
  let errorRows = 0;
  const errorDetails = [];

  try {
    const { parser, getError } = createCsvStream(resolvedPath);
    let batch = [];

    for await (const row of parser) {
      totalRows++;

      const student_code = (row["MSSV"] || "").trim();
      if (!student_code) {
        errorRows++;
        errorDetails.push(`Row ${totalRows}: missing MSSV`);
        continue;
      }

      batch.push(row);

      if (batch.length >= BATCH_SIZE) {
        await flushBatch(batch);
        processedRows += batch.length;
        batch = [];
        console.log(`[CSV Sync] Processed ${processedRows} rows…`);
      }
    }

    // Re-throw any stream-level error that was swallowed by the iterator.
    const streamErr = getError();
    if (streamErr) throw streamErr;

    // Flush the final partial batch (< BATCH_SIZE rows).
    if (batch.length > 0) {
      await flushBatch(batch);
      processedRows += batch.length;
    }

    const elapsedMs = Date.now() - startTime;
    const elapsedSec = (elapsedMs / 1000).toFixed(2);

    console.log(`[CSV Sync] Finished — ${processedRows} upserted, ${errorRows} skipped, ${elapsedSec}s elapsed`);

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

    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
