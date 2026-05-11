const STATES = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is OPEN — downstream service unavailable') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

class CircuitBreaker {
  /**
   * @param {object} opts
   * @param {number} opts.failureThreshold  Consecutive failures before opening (default: 3)
   * @param {number} opts.recoveryTimeout   Ms to wait before moving OPEN → HALF_OPEN (default: 15000)
   */
  constructor({ failureThreshold = 3, recoveryTimeout = 15_000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.openedAt = null;
  }

  /**
   * True when the circuit is OPEN and the recovery window has not yet elapsed.
   * Once the window elapses, fire() will attempt a probe (HALF_OPEN), so callers
   * should treat an expired-OPEN circuit as "worth trying via fire()".
   */
  get isOpen() {
    if (this.state !== STATES.OPEN) return false;
    return Date.now() - this.openedAt < this.recoveryTimeout;
  }

  /**
   * Executes fn if the circuit is CLOSED or HALF_OPEN.
   * Throws CircuitOpenError immediately if OPEN (and the recovery window is still active).
   * Records success/failure and drives state transitions.
   *
   * @param {() => Promise<any>} fn  The external call to protect
   * @returns {Promise<any>}
   */
  async fire(fn) {
    if (this.state === STATES.OPEN) {
      if (Date.now() - this.openedAt >= this.recoveryTimeout) {
        this._transitionTo(STATES.HALF_OPEN);
      } else {
        throw new CircuitOpenError();
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure();
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this._transitionTo(STATES.CLOSED);
  }

  _onFailure() {
    this.failureCount += 1;
    // Any failure in HALF_OPEN immediately re-opens; in CLOSED, open only at threshold.
    if (this.state === STATES.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this._transitionTo(STATES.OPEN);
    }
  }

  _transitionTo(newState) {
    if (this.state === newState) return;
    console.log(`[CircuitBreaker] ${this.state} → ${newState}`);
    this.state = newState;
    if (newState === STATES.OPEN) {
      this.openedAt = Date.now();
      this.failureCount = 0;
    }
  }
}

module.exports = { CircuitBreaker, CircuitOpenError, STATES };
