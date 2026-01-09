/**
 * Sentiment Analysis типы и интерфейсы
 */

/**
 * Результат анализа настроений
 */
export interface SentimentResult {
  sentiment: number; // -1 (negative) to 1 (positive)
  confidence: number; // 0 to 1
  label: SentimentLabel; // Метка класса
  entities: EntityInfo[]; // Извлеченные сущности
  impact: ImpactLevel; // Уровень важности
  keywords: string[]; // Ключевые слова
}

/**
 * Метки классификации настроений
 */
export enum SentimentLabel {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

/**
 * Уровень важности новости
 */
export enum ImpactLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Информация о сущности
 */
export interface EntityInfo {
  text: string; // Текст сущности
  type: EntityType; // Тип сущности
  start: number; // Позиция начала
  end: number; // Позиция конца
}

/**
 * Типы сущностей
 */
export enum EntityType {
  CRYPTOCURRENCY = 'cryptocurrency',
  COMPANY = 'company',
  PERSON = 'person',
  EXCHANGE = 'exchange',
  ORGANIZATION = 'organization',
}

/**
 * Запрос на анализ
 */
export interface AnalyzeRequest {
  text: string; // Текст для анализа
  type?: 'news' | 'social' | 'other'; // Тип контента
}

/**
 * Ответ от API
 */
export interface AnalyzeResponse {
  sentiment: number;
  confidence: number;
  label: SentimentLabel;
  entities: EntityInfo[];
  impact: ImpactLevel;
  keywords: string[];
  processingTime?: number; // Время обработки в мс
}

/**
 * Конфигурация анализатора
 */
export interface SentimentAnalyzerConfig {
  apiUrl: string; // URL Python микросервиса
  timeout?: number; // Таймаут запроса
  batchSize?: number; // Размер батча для обработки
  retries?: number; // Количество повторных попыток
}

/**
 * Статистика батч-обработки
 */
export interface BatchAnalysisResult {
  total: number;
  success: number;
  failed: number;
  results: SentimentResult[];
  errors: string[];
}
