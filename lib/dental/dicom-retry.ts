/**
 * DICOM Retry Service
 * Provides retry mechanisms for failed DICOM operations
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  exponentialBackoff?: boolean;
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

export class DicomRetry {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second
  private static readonly DEFAULT_RETRYABLE_ERRORS = [
    'network',
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
  ];

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      exponentialBackoff = true,
      retryableErrors = this.DEFAULT_RETRYABLE_ERRORS,
    } = options;

    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i <= maxRetries; i++) {
      attempts = i + 1;

      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

        // Check if error is retryable
        const isRetryable = retryableErrors.some((retryableError) =>
          errorMessage.includes(retryableError.toLowerCase())
        );

        if (!isRetryable || i === maxRetries) {
          return {
            success: false,
            error: lastError,
            attempts,
          };
        }

        // Calculate delay
        const delay = exponentialBackoff
          ? retryDelay * Math.pow(2, i)
          : retryDelay;

        // Wait before retry
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
    };
  }

  /**
   * Retry with custom retry condition
   */
  static async retryWithCondition<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: Error, attempt: number) => boolean,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      exponentialBackoff = true,
    } = options;

    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i <= maxRetries; i++) {
      attempts = i + 1;

      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;

        if (!shouldRetry(lastError, attempts) || i === maxRetries) {
          return {
            success: false,
            error: lastError,
            attempts,
          };
        }

        const delay = exponentialBackoff
          ? retryDelay * Math.pow(2, i)
          : retryDelay;

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
    };
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return this.DEFAULT_RETRYABLE_ERRORS.some((retryableError) =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }
}
