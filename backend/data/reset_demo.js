"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/db");

async function main() {
  console.log("[Reset] Removing spec demo students (@uni.edu.vn)...");
  const { count: sc } = await prisma.student.deleteMany({
    where: { email: { endsWith: "@uni.edu.vn" } },
  });
  console.log(`[Reset]   ✓ Deleted ${sc} student record(s)`);

  console.log("[Reset] Removing spec CSV sync logs...");
  const { count: lc } = await prisma.csvSyncLog.deleteMany({
    where: { file_name: "students_spec.csv" },
  });
  console.log(`[Reset]   ✓ Deleted ${lc} sync log(s)`);

  const csvPath = path.resolve(__dirname, "students_spec.csv");
  if (fs.existsSync(csvPath)) {
    fs.unlinkSync(csvPath);
    console.log("[Reset]   ✓ Deleted students_spec.csv");
  }

  console.log("[Reset] Done — ready to demo again.");
}

main()
  .catch((err) => {
    console.error("[Reset] Error:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
