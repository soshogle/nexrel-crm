/**
 * Circuit breaker to stop calling failing APIs and avoid cascading failures.
 * When failures exceed threshold, the circuit opens and requests fail fast.
 * After resetTimeout, one request is allowed (half-open) to test recovery.
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
}

const defaultOptions = {
  failureThreshold: 3,
  resetTimeout: 30_000, // 30s
};

const circuits = new Map<string, { state: CircuitState; failures: number; nextAttempt: number }>();

function getOrCreateCircuit(key: string, options: CircuitBreakerOptions) {
  const opts = { ...defaultOptions, ...options };
  let circuit = circuits.get(key);
  if (!circuit) {
    circuit = { state: 'CLOSED', failures: 0, nextAttempt: 0 };
    circuits.set(key, circuit);
  }
  return { circuit, opts };
}

/**
 * Execute a function with circuit breaker protection.
 * Throws immediately if circuit is OPEN.
 */
export async function withCircuitBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  options?: CircuitBreakerOptions
): Promise<T> {
  const { circuit, opts } = getOrCreateCircuit(key, options ?? {});

  if (circuit.state === 'OPEN') {
    if (Date.now() < circuit.nextAttempt) {
      throw new Error(`Circuit breaker open for ${key}`);
    }
    circuit.state = 'HALF_OPEN';
  }

  try {
    const result = await fn();
    if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'CLOSED';
      circuit.failures = 0;
    } else if (circuit.state === 'CLOSED') {
      circuit.failures = 0;
    }
    return result;
  } catch (err) {
    circuit.failures += 1;
    if (circuit.failures >= opts.failureThreshold) {
      circuit.state = 'OPEN';
      circuit.nextAttempt = Date.now() + opts.resetTimeout;
    } else if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      circuit.nextAttempt = Date.now() + opts.resetTimeout;
    }
    throw err;
  }
}

/**
 * Fetch with circuit breaker. Use for non-critical APIs that may fail repeatedly.
 */
export async function fetchWithCircuitBreaker(
  url: string,
  init?: RequestInit,
  options?: CircuitBreakerOptions
): Promise<Response> {
  const key = `fetch:${url.split('?')[0]}`;
  return withCircuitBreaker(
    key,
    () => fetch(url, init),
    options
  );
}
