import type { SocialPlatform } from '../types.js';

/**
 * Простой логгер для социальных коллекторов
 */
export class SocialLogger {
  private platform: SocialPlatform;

  constructor(platform: SocialPlatform) {
    this.platform = platform;
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[${this.platform}] ${message}`, ...args);
  }

  error(message: string, error?: Error | unknown): void {
    if (error instanceof Error) {
      console.error(`[${this.platform}] ${message}:`, error.message);
    } else {
      console.error(`[${this.platform}] ${message}`, error);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.platform}] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env.DEBUG === 'true') {
      console.debug(`[${this.platform}] ${message}`, ...args);
    }
  }
}
