/**
 * Sentiment Analysis Types
 */

/**
 * Sentiment analysis result
 */
export interface SentimentResult {
  sentiment: number; // -1 (negative) to 1 (positive)
  confidence: number; // 0 to 1
  label: 'positive' | 'negative' | 'neutral';
  entities: string[]; // Extracted entities (cryptocurrencies, companies, people)
  impact: 'low' | 'medium' | 'high'; // Impact level
  keywords: string[]; // Key words extracted
}

/**
 * Content type for analysis
 */
export type ContentType = 'news' | 'social' | 'article';

/**
 * Request for sentiment analysis
 */
export interface AnalyzeRequest {
  text: string;
  type?: ContentType;
}

/**
 * Batch request for sentiment analysis
 */
export interface BatchAnalyzeRequest {
  texts: string[];
  type?: ContentType;
}

/**
 * Batch response for sentiment analysis
 */
export interface BatchAnalyzeResponse {
  results: SentimentResult[];
  processed: number;
}

/**
 * Service health status
 */
export interface HealthStatus {
  status: string;
  models_loaded: boolean;
  version: string;
}

/**
 * Configuration for sentiment analysis service
 */
export interface SentimentServiceConfig {
  baseUrl: string;
  timeout?: number; // in milliseconds
  retries?: number;
}

/**
 * Error response from service
 */
export interface SentimentError {
  detail: string;
  status_code: number;
}
