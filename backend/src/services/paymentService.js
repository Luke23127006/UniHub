const { CircuitBreaker, CircuitOpenError } = require('../utils/CircuitBreaker');

const GATEWAY_URL = process.env.MOCK_PAYMENT_GATEWAY_URL || 'http://localhost:4000';
const GATEWAY_TIMEOUT_MS = 1_000;

const paymentCircuit = new CircuitBreaker({ failureThreshold: 3, recoveryTimeout: 15_000 });

/**
 * Returns true when the payment circuit is OPEN and the recovery window has not elapsed.
 * Callers use this to decide the registration flow before entering a DB transaction.
 */
function isCircuitOpen() {
  return paymentCircuit.isOpen;
}

/**
 * Calls the mock payment gateway to initiate a payment session.
 * Wrapped in the circuit breaker — throws CircuitOpenError if the circuit is OPEN.
 *
 * @param {bigint|string} registrationId
 * @param {Decimal|number} amount
 * @returns {Promise<{ paymentUrl: string }>}
 */
async function initiatePayment(registrationId, amount) {
  return paymentCircuit.fire(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

    try {
      const response = await fetch(`${GATEWAY_URL}/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: registrationId.toString(),
          amount: amount?.toString() ?? '0',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Mock gateway responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      // Fall back to a constructed URL if the gateway omits it (test environments).
      return { paymentUrl: data.paymentUrl ?? `${GATEWAY_URL}/pay/${registrationId}` };
    } finally {
      clearTimeout(timer);
    }
  });
}

module.exports = { initiatePayment, isCircuitOpen, CircuitOpenError };
