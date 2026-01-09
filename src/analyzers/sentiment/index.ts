/**
 * Sentiment Analysis Module
 *
 * Provides sentiment analysis for news and social media content using NLP
 */

export { SentimentClient, createSentimentClient } from './client/SentimentClient';
export type {
  SentimentResult,
  AnalyzeRequest,
  BatchAnalyzeRequest,
  BatchAnalyzeResponse,
  HealthStatus,
  SentimentServiceConfig,
  ContentType,
} from './types';
