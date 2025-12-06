/**
 * Utility functions for resilient HTTP requests with retry logic.
 * Implements exponential backoff and configurable timeout.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  timeout: 30000,
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (!error.response) return true;
    const status = error.response?.status;
    return status >= 500 && status < 600;
  },
  onRetry: () => {},
};

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = Math.min(
    options.initialDelay * Math.pow(2, attempt),
    options.maxDelay
  );
  // Add jitter (±25%)
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry logic and exponential backoff.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws Error if all retries are exhausted
 * 
 * @example
 * ```typescript
 * const data = await withRetry(
 *   () => axios.get('/api/data'),
 *   { maxRetries: 3, timeout: 5000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${opts.timeout}ms`)), opts.timeout);
      });

      // Race between the actual request and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      opts.onRetry(error, attempt + 1, delay);
      
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry-wrapped version of an async function
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}
