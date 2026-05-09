import http from 'k6/http';
import { check } from 'k6';

// -----------------------------------------------------------
// K6 LOAD TEST CONFIGURATION
// -----------------------------------------------------------
export const options = {
  scenarios: {
    high_load_registration: {
      executor: 'shared-iterations',
      vus: 500,          // Simulate 500 Virtual Users concurrently
      iterations: 12000, // Total of 12,000 requests to fire
      maxDuration: '2m', // Maximum duration for the test to run
    },
  },
  // Define pass/fail criteria for the load test
  thresholds: {
    http_req_failed: ['rate<0.01'], // Failure rate must be strictly less than 1%
  },
};

// -----------------------------------------------------------
// TEST EXECUTION FUNCTION (Runs for each iteration)
// -----------------------------------------------------------
export default function () {
  // Replace with your actual local endpoint. Here we use workshop ID 1.
  const url = 'http://localhost:3000/api/workshops/1/register';

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