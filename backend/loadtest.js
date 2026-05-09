import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    registration_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 2000,
      stages: [
        // --- PHASE 1: FIRST 3 MINUTES (Spike 200 requests/s) ---
        { duration: '10s', target: 200 },
        { duration: '2m40s', target: 200 },
        { duration: '10s', target: 60 },

        // --- PHASE 2: NEXT 7 MINUTES (Stable ~60 requests/s) ---
        { duration: '6m50s', target: 60 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  // Note: Remove strict threshold http_req_failed < 0.01.
  // Because we have Rate Limit, the server returning 429 (Too Many Requests) is a SUCCESSFUL protection of the system, not an error.
};

export default function () {
  // Replace with your actual local endpoint. Here we use workshop ID 1.
  const url = __ENV.K6_API_URL || 'http://localhost:3000/api/v1/workshops/1/register';

  // Generate a random user ID between 1 and 12,000
  // This prevents unique constraint violations in the DB when the worker processes the queue
  const randomUserId = Math.floor(Math.random() * 12000) + 1;

  // The controller extracts data from route params and headers,
  // so the payload body can just be empty.
  const payload = JSON.stringify({});

  // Attach the custom header required by the mock authMiddleware
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': randomUserId.toString(), // Mock Auth Middleware uses this header
    },
  };

  // Fire the POST request to the API
  const res = http.post(url, payload, params);

  // Validate the response
  // A successful push to RabbitMQ should return HTTP 202 Accepted immediately.
  // Under load, HTTP 429 Too Many Requests is also an expected outcome because
  // rate limiting is considered successful protection of the system for this test.
  check(res, {
    'status is 202 Accepted or 429 Too Many Requests': (r) =>
      r.status === 202 || r.status === 429,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}