/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring and controlling request flow
 */

import { CircuitBreakerState, CircuitBreakerConfig } from '../types.js';

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: Date | null = null;
  private nextAttemptTime: Date | null = null;
  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(
    name: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000, // 60 seconds
      resetTimeout: config.resetTimeout ?? 60000, // 60 seconds
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        console.log(`🔄 Circuit breaker [${this.name}] transitioning to HALF_OPEN`);
      } else {
        const error = new Error(`Circuit breaker [${this.name}] is OPEN`);
        error.name = 'CircuitBreakerError';
        throw error;
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker [${this.name}] timeout`));
      }, this.config.timeout);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        console.log(`✅ Circuit breaker [${this.name}] reset to CLOSED`);
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.successCount = 0;
      this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
      console.warn(`⚠️  Circuit breaker [${this.name}] reopened to OPEN`);
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
      console.warn(
        `⚠️  Circuit breaker [${this.name}] opened due to ${this.failureCount} failures`,
      );
    }
  }

  /**
   * Check if should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return false;
    }

    return Date.now() >= this.nextAttemptTime.getTime();
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get success count
   */
  getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Get last failure time
   */
  getLastFailureTime(): Date | null {
    return this.lastFailureTime;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    console.log(`🔄 Circuit breaker [${this.name}] manually reset`);
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    name: string;
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: Date | null;
    nextAttemptTime: Date | null;
  } {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}
