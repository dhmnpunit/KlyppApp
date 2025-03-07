/**
 * Performance monitoring utility for Klypp app
 * Helps track query performance and RLS-related issues
 */

import { Platform } from 'react-native';

type PerformanceMetric = {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: any;
  metadata?: Record<string, any>;
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean = __DEV__;
  private errorPatterns: RegExp[] = [
    /infinite recursion/i,
    /violates row-level security/i,
    /permission denied/i,
    /policy for relation/i
  ];

  /**
   * Start tracking a database operation
   * @param operation Name of the operation (e.g., 'fetchSubscriptions')
   * @param metadata Additional context about the operation
   * @returns A unique identifier for the operation
   */
  startOperation(operation: string, metadata?: Record<string, any>): number {
    if (!this.isEnabled) return -1;
    
    const metric: PerformanceMetric = {
      operation,
      startTime: performance.now(),
      success: true,
      metadata
    };
    
    this.metrics.push(metric);
    return this.metrics.length - 1;
  }

  /**
   * End tracking a database operation
   * @param id The operation identifier returned by startOperation
   * @param success Whether the operation was successful
   * @param error Any error that occurred
   */
  endOperation(id: number, success: boolean = true, error?: any): void {
    if (!this.isEnabled || id < 0 || id >= this.metrics.length) return;
    
    const metric = this.metrics[id];
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.success = success;
    metric.error = error;
    
    // Log slow operations (> 500ms)
    if (metric.duration > 500) {
      console.warn(`Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
      console.log('Operation metadata:', metric.metadata);
    }
    
    // Check for RLS-related errors
    if (error && this.isRLSError(error)) {
      console.error(`RLS policy error in operation: ${metric.operation}`);
      console.error('Error details:', error);
      console.log('Operation metadata:', metric.metadata);
    }
  }

  /**
   * Check if an error is related to RLS policies
   * @param error The error to check
   * @returns Whether the error is RLS-related
   */
  private isRLSError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = typeof error === 'string' 
      ? error 
      : error.message || JSON.stringify(error);
    
    return this.errorPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Get performance metrics for analysis
   * @returns Array of performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all collected metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Enable or disable performance monitoring
   * @param enabled Whether monitoring should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Create a wrapper for async functions to automatically track performance
   * @param operation Operation name
   * @param fn The async function to wrap
   * @param metadata Additional context
   * @returns A wrapped function that tracks performance
   */
  trackAsync<T>(
    operation: string, 
    fn: (...args: any[]) => Promise<T>, 
    metadata?: Record<string, any>
  ): (...args: any[]) => Promise<T> {
    return async (...args: any[]) => {
      const id = this.startOperation(operation, {
        ...metadata,
        arguments: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : arg
        )
      });
      
      try {
        const result = await fn(...args);
        this.endOperation(id, true);
        return result;
      } catch (error) {
        this.endOperation(id, false, error);
        throw error;
      }
    };
  }
}

// Export a singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for tracking performance of class methods
 * @param operation Operation name
 */
export function track(operation?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const opName = operation || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = function (...args: any[]) {
      if (originalMethod.constructor.name === 'AsyncFunction') {
        return performanceMonitor.trackAsync(
          opName,
          originalMethod.bind(this),
          { className: target.constructor.name }
        )(...args);
      } else {
        const id = performanceMonitor.startOperation(opName, {
          className: target.constructor.name,
          arguments: args
        });
        
        try {
          const result = originalMethod.apply(this, args);
          performanceMonitor.endOperation(id, true);
          return result;
        } catch (error) {
          performanceMonitor.endOperation(id, false, error);
          throw error;
        }
      }
    };
    
    return descriptor;
  };
} 