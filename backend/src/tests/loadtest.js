// RUN: docker compose --profile test up --force-recreate k6
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    registration_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 2000,
      stages: [
        // --- PHASE 1: FIRST 3 MINUTES (Spike 40 requests/s) ---
        { duration: '10s', target: 200 },
        { duration: '2m40s', target: 200 },
        { duration: '10s', target: 60 },

        // --- PHASE 2: NEXT 7 MINUTES (Stable ~12 requests/s) ---
        { duration: '6m50s', target: 60 },
        { duration: '10s', target: 0 },
      ],
    },
  },
};

export default function () {
  // Base API URL
  const baseUrl = __ENV.K6_API_URL || "http://localhost:3000/api/v1";

  // Generate a random student User ID between 8 and 12,000 (User IDs 1-7 are reserved for manual testing)
  const randomUserId = Math.floor(Math.random() * 11993) + 8;

  // 1️⃣ Weighted Popularity: Choose a workshop ID from 1 to 7
  // Simulate hot spots: Workshop 1 (30% weight), Workshop 2 (20% weight), Workshops 3-7 (10% weight each)
  let workshopId = 1;
  const randPopularity = Math.random();
  if (randPopularity < 0.3) {
    workshopId = 1; // "Hệ thống Phân tán Quy mô lớn" (Super Hot!)
  } else if (randPopularity < 0.5) {
    workshopId = 2; // "AI & Generative Models 2024" (Hot!)
  } else {
    // Pick randomly between Workshops 3 to 7
    workshopId = Math.floor(Math.random() * 5) + 3;
  }

  // 2️⃣ Simulate User Journey: 3 possible actions
  // - 60% of students browse the catalog (GET /workshops)
  // - 20% view details of the selected workshop (GET /workshops/:id)
  // - 20% try to register for the workshop (POST /registrations)
  const randAction = Math.random();

  const params = {
    headers: {
      "Content-Type": "application/json",
      "x-user-id": randomUserId.toString(),
    },
  };

  if (randAction < 0.6) {
    // Action A: Browse Catalog (60%)
    const res = http.get(`${baseUrl}/workshops`, params);
    check(res, {
      "browse status is 200": (r) => r.status === 200,
      "browse response time < 500ms": (r) => r.timings.duration < 500,
    });

  } else if (randAction < 0.8) {
    // Action B: View Workshop Details (20%)
    const res = http.get(`${baseUrl}/workshops/${workshopId}`, params);
    check(res, {
      "detail status is 200": (r) => r.status === 200,
      "detail response time < 500ms": (r) => r.timings.duration < 500,
    });

  } else {
    // Action C: Register (20%)
    const payload = JSON.stringify({ workshopId });

    // Generate a consistent idempotency key for this user & workshop combo
    // This perfectly simulates double-clicking or client-side retries!
    const idempotencyKey = `idemp-k6-${randomUserId}-${workshopId}`;

    const regParams = {
      headers: {
        "Content-Type": "application/json",
        "x-user-id": randomUserId.toString(),
        "x-idempotency-key": idempotencyKey,
      },
    };

    const res = http.post(`${baseUrl}/registrations`, payload, regParams);

    // Expecting 201 Created or 429 Too Many Requests (if rate limited)
    // Or 409 Conflict if workshop is sold out.
    // Or 400 Bad Request if the student is already registered for this workshop.
    check(res, {
      "register status is valid (201, 400, 409, 429)": (r) =>
        [201, 400, 409, 429].indexOf(r.status) !== -1,
      "register response time < 500ms": (r) => r.timings.duration < 500,
    });
  }

  // Small delay to simulate user pacing (think time)
  sleep(0.1);
}
