/**
 * BTC Trading Bot - Main Entry Point
 */

export * from './types/news';
export * from './collectors/news';
export * from './utils/deduplicator';
export * from './utils/normalizer';
export * from './database/connection';
export * from './database/repository';

console.log('BTC Trading Bot - News Collector Module');
console.log('Run with: npm run collect');
