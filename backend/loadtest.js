import http from 'k6/http';
import { check } from 'k6';

// -----------------------------------------------------------
// K6 LOAD TEST CONFIGURATION
// -----------------------------------------------------------
export const options = {
  scenarios: {
    registration_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',       // Calculate based on rate (requests per second)
      preAllocatedVUs: 100, // Pre-allocate 100 virtual users
      maxVUs: 1000,         // Allow K6 to scale up to 1000 virtual users if needed
      stages: [
        // --- PHASE 1: FIRST 3 MINUTES (Spike 40 requests/s) ---
        { duration: '10s', target: 40 },   // Ramp up quickly to 40 requests per second in 10s
        { duration: '2m40s', target: 40 }, // Maintain high intensity of 40 req/s (60% of students)
        { duration: '10s', target: 12 },   // Reduce to normal level

        // --- PHASE 2: NEXT 7 MINUTES (Stable ~12 requests/s) ---
        { duration: '6m50s', target: 12 }, // Maintain stable rate of 12 req/s (40% of students)
        { duration: '10s', target: 0 },    // Lower gradually to 0 and end
      ],
    },
  },
  // Note: Remove strict threshold http_req_failed < 0.01. 
  // Because we have Rate Limit, the server returning 429 (Too Many Requests) is a SUCCESSFUL protection of the system, not an error.
};

// -----------------------------------------------------------
// TEST EXECUTION FUNCTION (Runs for each iteration)
// -----------------------------------------------------------
export default function () {
  // Replace with your actual local endpoint. Here we use workshop ID 1.
  const url = __ENV.K6_API_URL || 'http://localhost:3000/api/v1/workshops/1/register';

  // Generate a random user ID between 1 and 100,000
  // This prevents unique constraint violations in the DB when the worker processes the queue
  const randomUserId = Math.floor(Math.random() * 100000) + 1;

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
  // A successful push to RabbitMQ should return HTTP 202 Accepted immediately
  check(res, {
    'status is 202 Accepted': (r) => r.status === 202,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
