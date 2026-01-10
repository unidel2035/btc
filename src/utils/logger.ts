/**
 * Structured Logger
 * Centralized logging with different log levels and structured output
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogMetadata {
  [key: string]: unknown;
}

export class Logger {
  private context: string;
  private minLevel: LogLevel;

  constructor(context: string, minLevel?: LogLevel) {
    this.context = context;
    this.minLevel = minLevel || this.getMinLevelFromEnv();
  }

  private getMinLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toLowerCase();
    switch (level) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLog(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const logObject = {
      timestamp,
      level,
      context: this.context,
      message,
      ...metadata,
    };

    // Structured JSON logging in production
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(logObject);
    }

    // Pretty printing in development
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${metadataStr}`;
  }

  public debug(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatLog(LogLevel.DEBUG, message, metadata));
    }
  }

  public info(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatLog(LogLevel.INFO, message, metadata));
    }
  }

  public warn(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLog(LogLevel.WARN, message, metadata));
    }
  }

  public error(message: string, error?: unknown, metadata?: LogMetadata): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorMetadata = {
        ...metadata,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      };
      console.error(this.formatLog(LogLevel.ERROR, message, errorMetadata));
    }
  }

  // Trading-specific log methods
  public trade(message: string, metadata: LogMetadata): void {
    this.info(message, { type: 'trade', ...metadata });
  }

  public signal(message: string, metadata: LogMetadata): void {
    this.info(message, { type: 'signal', ...metadata });
  }

  public risk(message: string, metadata: LogMetadata): void {
    this.warn(message, { type: 'risk', ...metadata });
  }
}

// Create logger factory
export function createLogger(context: string, minLevel?: LogLevel): Logger {
  return new Logger(context, minLevel);
}

// Default logger instance
export const logger = new Logger('app');
