"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const prisma = require("../src/config/db");

const DEMO_CODES = [
  "2024001001",
  "2024001002",
  "2024001003",
  "2024001004",
  "2024001005",
  "2024001006",
];

async function main() {
  console.log("[Reset] Removing demo students...");
  const { count } = await prisma.student.deleteMany({
    where: { student_code: { in: DEMO_CODES } },
  });
  console.log(`[Reset]   ✓ Deleted ${count} student record(s)`);

  console.log("[Reset] Removing demo CSV sync logs...");
  const { count: logCount } = await prisma.csvSyncLog.deleteMany({
    where: { file_name: "demo_import.csv" },
  });
  console.log(`[Reset]   ✓ Deleted ${logCount} sync log(s)`);

  console.log("[Reset] Done — ready to demo again.");
}

main()
  .catch((err) => {
    console.error("[Reset] Error:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
