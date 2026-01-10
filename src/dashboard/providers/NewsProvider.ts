/**
 * News Provider для Dashboard
 * Интегрирует NewsCollectorManager и SentimentAnalyzerClient
 */

/* eslint-disable no-console */
import { NewsCollectorManager } from '../../collectors/news/NewsCollectorManager.js';
import { InMemoryNewsStorage } from '../../collectors/news/storage.js';
import { SentimentAnalyzerClient } from '../../analyzers/sentiment/SentimentAnalyzerClient.js';
import { storage } from '../storage.js';
import type { DashboardWebSocket } from '../websocket.js';
import type { NewsItem as CollectorNewsItem } from '../../collectors/news/types.js';

export class NewsProvider {
  private newsCollector: NewsCollectorManager;
  private sentimentAnalyzer: SentimentAnalyzerClient;
  private ws: DashboardWebSocket | null;
  private collectionInterval: NodeJS.Timeout | null = null;
  private newsStorage: InMemoryNewsStorage;
  private isHealthy: boolean = false;

  constructor(ws?: DashboardWebSocket) {
    this.ws = ws || null;

    // Создаём собственное хранилище для NewsCollectorManager
    this.newsStorage = new InMemoryNewsStorage();

    // Инициализация NewsCollectorManager
    this.newsCollector = new NewsCollectorManager(this.newsStorage);

    // Инициализация анализатора sentiment
    const sentimentUrl = process.env.SENTIMENT_API_URL || 'http://localhost:8000';
    this.sentimentAnalyzer = new SentimentAnalyzerClient({
      apiUrl: sentimentUrl,
      timeout: 30000,
      batchSize: 10,
      retries: 3,
    });

    console.log(`📊 NewsProvider initialized with sentiment analyzer at ${sentimentUrl}`);
  }

  async start(): Promise<void> {
    console.log('📰 Starting news provider...');

    // Проверяем доступность sentiment analyzer
    this.isHealthy = await this.checkSentimentAnalyzer();

    // Инициализируем коллекторы новостей
    this.newsCollector.initialize();

    // Собираем начальную партию новостей
    await this.collectNews();

    // Периодический сбор новостей
    const intervalMs = parseInt(process.env.NEWS_UPDATE_INTERVAL || '300000'); // 5 минут по умолчанию
    this.collectionInterval = setInterval(() => {
      void this.collectNews();
    }, intervalMs);

    console.log(`✅ News provider started (interval: ${intervalMs / 1000}s)`);
  }

  /**
   * Проверка доступности sentiment analyzer
   */
  private async checkSentimentAnalyzer(): Promise<boolean> {
    try {
      const healthy = await this.sentimentAnalyzer.healthCheck();
      if (healthy) {
        console.log('✅ Sentiment analyzer is available');
        return true;
      } else {
        console.warn('⚠️  Sentiment analyzer is not available - will continue without sentiment');
        return false;
      }
    } catch (error) {
      console.warn(
        '⚠️  Sentiment analyzer health check failed - will continue without sentiment:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Сбор новостей из всех источников
   */
  private async collectNews(): Promise<void> {
    try {
      console.log('📥 Collecting news from all sources...');

      // Собираем новости через NewsCollectorManager
      await this.newsCollector.collectAll();

      // Получаем недавние новости из хранилища коллектора
      const recentNews = await this.newsStorage.getRecent(50);

      console.log(`📊 Processing ${recentNews.length} news items`);

      // Обрабатываем каждую новость
      for (const article of recentNews) {
        await this.processArticle(article);
      }

      console.log(`✅ News collection complete: ${recentNews.length} articles processed`);
    } catch (error) {
      console.error(
        '❌ Failed to collect news:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Обработка одной статьи
   */
  private async processArticle(article: CollectorNewsItem): Promise<void> {
    try {
      let sentimentLabel: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
      let sentimentScore = 0;

      // Анализируем sentiment, если сервис доступен
      if (this.isHealthy) {
        try {
          const text = `${article.title}. ${article.content}`;
          const sentimentResult = await this.sentimentAnalyzer.analyze(text, 'news');

          sentimentLabel = this.mapSentimentLabel(sentimentResult.sentiment);
          sentimentScore = sentimentResult.sentiment;

          console.log(
            `📊 [${article.source}] "${article.title.substring(0, 50)}..." => ${sentimentLabel} (${sentimentScore.toFixed(2)})`,
          );
        } catch (error) {
          console.warn(
            `Failed to analyze sentiment for article ${article.id}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      // Преобразуем в формат Dashboard NewsItem
      const newsItem = storage.addNews({
        title: article.title,
        content: article.content || '',
        source: article.source,
        url: article.url,
        sentiment: sentimentLabel,
        sentimentScore: sentimentScore,
        publishedAt: article.publishedAt.toISOString(),
      });

      // Отправляем через WebSocket
      if (this.ws) {
        this.ws.broadcastNews(newsItem);
      }
    } catch (error) {
      console.error(
        `Failed to process article ${article.id}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Маппинг sentiment score на label
   */
  private mapSentimentLabel(score: number): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (score > 0.2) return 'POSITIVE';
    if (score < -0.2) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Остановка провайдера
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }

    // Останавливаем scheduler NewsCollectorManager если он запущен
    try {
      this.newsCollector.stopScheduler();
    } catch (error) {
      // Игнорируем ошибки при остановке
    }

    console.log('⏹️  News provider stopped');
  }

  /**
   * Получение статистики
   */
  getStats(): {
    isHealthy: boolean;
    collectorStats: ReturnType<typeof this.newsCollector.getStats>;
    storageStats: ReturnType<InMemoryNewsStorage['getStats']>;
  } {
    return {
      isHealthy: this.isHealthy,
      collectorStats: this.newsCollector.getStats(),
      storageStats: this.newsStorage.getStats(),
    };
  }
}
