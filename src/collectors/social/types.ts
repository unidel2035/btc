/**
 * Платформа социальной сети
 */
export type SocialPlatform = 'twitter' | 'reddit' | 'telegram';

/**
 * Структура поста из социальной сети
 */
export interface SocialPost {
  /** Уникальный идентификатор поста */
  id: string;

  /** Платформа, откуда получен пост */
  platform: SocialPlatform;

  /** Автор поста */
  author: string;

  /** Количество подписчиков автора (если доступно) */
  authorFollowers?: number;

  /** Текстовое содержимое поста */
  content: string;

  /** Метрики вовлеченности */
  engagement: {
    /** Количество лайков/upvotes */
    likes: number;
    /** Количество комментариев */
    comments: number;
    /** Количество репостов/shares */
    shares: number;
  };

  /** Временная метка создания поста */
  timestamp: Date;

  /** URL поста */
  url: string;
}

/**
 * Конфигурация коллектора
 */
export interface CollectorConfig {
  /** Интервал опроса в миллисекундах */
  pollInterval: number;

  /** Максимальное количество постов за один запрос */
  batchSize: number;

  /** Флаг активности коллектора */
  enabled: boolean;
}

/**
 * Базовый интерфейс для всех коллекторов
 */
export interface ICollector {
  /** Название коллектора */
  name: string;

  /** Инициализация коллектора */
  initialize(): Promise<void>;

  /** Сбор данных */
  collect(): Promise<SocialPost[]>;

  /** Остановка коллектора */
  stop(): Promise<void>;

  /** Проверка статуса */
  isRunning(): boolean;
}

/**
 * Результат сбора данных
 */
export interface CollectionResult {
  /** Платформа */
  platform: SocialPlatform;

  /** Собранные посты */
  posts: SocialPost[];

  /** Количество собранных постов */
  count: number;

  /** Временная метка сбора */
  collectedAt: Date;

  /** Ошибки при сборе */
  errors?: Error[];
}

/**
 * Статистика коллектора
 */
export interface CollectorStats {
  /** Название коллектора */
  name: string;

  /** Общее количество собранных постов */
  totalPosts: number;

  /** Количество успешных запросов */
  successfulRequests: number;

  /** Количество неудачных запросов */
  failedRequests: number;

  /** Последний запрос */
  lastRequest?: Date;

  /** Статус работы */
  status: 'running' | 'stopped' | 'error';
}
