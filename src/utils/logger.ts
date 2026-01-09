/**
 * Structured logging utility for the BTC Trading Bot
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output in production
 * - Human-readable output in development
 * - Context and metadata support
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export class Logger {
  private context: LogContext;
  private minLevel: LogLevel;

  constructor(context: LogContext = {}) {
    this.context = context;
    this.minLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'info');
  }

  private parseLogLevel(level: string): LogLevel {
    const normalizedLevel = level.toLowerCase();
    if (Object.values(LogLevel).includes(normalizedLevel as LogLevel)) {
      return normalizedLevel as LogLevel;
    }
    return LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as NodeJS.ErrnoException).code,
      };
    }

    return entry;
  }

  private outputLog(entry: LogEntry): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // JSON output for production (machine-readable)
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable output for development
      const emoji = this.getEmoji(entry.level);
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const contextStr =
        Object.keys(entry.context || {}).length > 0 ? ` ${JSON.stringify(entry.context)}` : '';

      const logFn = this.getConsoleMethod(entry.level);
      logFn(`${emoji} [${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`);

      if (entry.error) {
        console.error('  Error:', entry.error.message);
        if (entry.error.stack) {
          console.error('  Stack:', entry.error.stack);
        }
      }
    }
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return '📘';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      default:
        return '📝';
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.DEBUG:
        return console.debug;
      default:
        return console.log;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatLogEntry(LogLevel.DEBUG, message, context);
      this.outputLog(entry);
    }
  }

  /**
   * Log at INFO level
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatLogEntry(LogLevel.INFO, message, context);
      this.outputLog(entry);
    }
  }

  /**
   * Log at WARN level
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.formatLogEntry(LogLevel.WARN, message, context);
      this.outputLog(entry);
    }
  }

  /**
   * Log at ERROR level
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.formatLogEntry(LogLevel.ERROR, message, context, error);
      this.outputLog(entry);
    }
  }
}

// Default logger instance
export const logger = new Logger({
  service: 'btc-trading-bot',
  version: process.env.npm_package_version || '0.1.0',
});

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext): void => logger.debug(message, context),
  info: (message: string, context?: LogContext): void => logger.info(message, context),
  warn: (message: string, context?: LogContext): void => logger.warn(message, context),
  error: (message: string, error?: Error, context?: LogContext): void =>
    logger.error(message, error, context),
};
