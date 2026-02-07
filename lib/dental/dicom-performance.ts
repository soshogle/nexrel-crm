/**
 * DICOM Performance Monitoring
 * Tracks performance metrics for DICOM operations
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

export class DicomPerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Track a performance metric
   */
  static track(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: new Date(),
      success,
      metadata,
    };

    this.metrics.push(metric);

    // Keep only last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > 5000) {
      console.warn(`[DICOM Performance] Slow operation: ${operation} took ${duration}ms`, metadata);
    }
  }

  /**
   * Measure and track an async operation
   */
  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      const result = await fn();
      success = true;
      return result;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const duration = Date.now() - start;
      this.track(operation, duration, success, {
        ...metadata,
        error: errorMessage,
      });
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const filtered = operation
      ? this.metrics.filter((m) => m.operation === operation)
      : this.metrics;

    if (filtered.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b);
    const successes = filtered.filter((m) => m.success).length;

    const sum = durations.reduce((a, b) => a + b, 0);
    const avgDuration = sum / durations.length;
    const minDuration = durations[0];
    const maxDuration = durations[durations.length - 1];
    const successRate = successes / filtered.length;

    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    return {
      count: filtered.length,
      avgDuration,
      minDuration,
      maxDuration,
      successRate,
      p50,
      p95,
      p99,
    };
  }

  /**
   * Get all metrics
   */
  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  static clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  static export(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}
