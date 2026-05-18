"use strict";

const { execSync } = require("child_process");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const CSV_FILE   = process.argv[2] || path.resolve(__dirname, "students_spec.csv");
const WORKER     = path.resolve(__dirname, "../src/jobs/csvSyncWorker.js");

console.log(`[Trigger] Running CSV sync on: ${CSV_FILE}`);

execSync(`node "${WORKER}" "${CSV_FILE}"`, { stdio: "inherit", env: process.env });
