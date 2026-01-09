/**
 * Demo Data Generator
 * Генератор демо данных для тестирования dashboard
 */

import { storage } from './storage.js';
import type { DashboardWebSocket } from './websocket.js';

export class DemoDataGenerator {
  private signalInterval: NodeJS.Timeout | null = null;
  private newsInterval: NodeJS.Timeout | null = null;
  private ws: DashboardWebSocket | null = null;

  constructor(ws?: DashboardWebSocket) {
    this.ws = ws || null;
  }

  start(): void {
    console.log('🎲 Starting demo data generator...');

    // Добавляем начальные позиции
    this.addInitialPositions();

    // Генерируем сигналы каждые 10 секунд
    this.signalInterval = setInterval(() => {
      this.generateSignal();
    }, 10000);

    // Генерируем новости каждые 20 секунд
    this.newsInterval = setInterval(() => {
      this.generateNews();
    }, 20000);

    // Генерируем начальные данные
    this.generateInitialData();
  }

  stop(): void {
    if (this.signalInterval) clearInterval(this.signalInterval);
    if (this.newsInterval) clearInterval(this.newsInterval);
  }

  private addInitialPositions(): void {
    // Добавляем несколько начальных позиций
    const btcPosition = storage.addPosition({
      symbol: 'BTC/USDT',
      side: 'LONG',
      size: 0.5,
      entryPrice: 50000,
      currentPrice: 51000,
      stopLoss: 49000,
      takeProfit: 52500,
      pnl: 500,
      pnlPercent: 2.0,
    });

    const ethPosition = storage.addPosition({
      symbol: 'ETH/USDT',
      side: 'LONG',
      size: 5,
      entryPrice: 3000,
      currentPrice: 3100,
      stopLoss: 2900,
      takeProfit: 3300,
      pnl: 500,
      pnlPercent: 3.33,
    });

    console.log('✅ Added initial positions:', btcPosition.id, ethPosition.id);
  }

  private generateInitialData(): void {
    // Генерируем историю сигналов
    const signalTypes = ['NEWS_MOMENTUM', 'SENTIMENT_SWING', 'TECHNICAL', 'EVENT_DRIVEN'];
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT'];
    const actions = ['BUY', 'SELL', 'HOLD'] as const;

    for (let i = 0; i < 10; i++) {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      storage.addSignal({
        type: signalTypes[Math.floor(Math.random() * signalTypes.length)] as string,
        source: 'Demo Generator',
        symbol: symbols[Math.floor(Math.random() * symbols.length)] as string,
        action: randomAction!,
        strength: Math.random() * 100,
        confidence: 0.6 + Math.random() * 0.4,
        price: 40000 + Math.random() * 20000,
        reason: this.generateSignalReason(),
      });
    }

    // Генерируем историю новостей
    for (let i = 0; i < 10; i++) {
      this.generateNews();
    }

    console.log('✅ Generated initial demo data');
  }

  private generateSignal(): void {
    const signalTypes = ['NEWS_MOMENTUM', 'SENTIMENT_SWING', 'TECHNICAL', 'EVENT_DRIVEN'];
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT'];
    const actions = ['BUY', 'SELL', 'HOLD'] as const;

    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const signal = storage.addSignal({
      type: signalTypes[Math.floor(Math.random() * signalTypes.length)] as string,
      source: 'Demo Generator',
      symbol: symbols[Math.floor(Math.random() * symbols.length)] as string,
      action: randomAction!,
      strength: Math.random() * 100,
      confidence: 0.6 + Math.random() * 0.4,
      price: 40000 + Math.random() * 20000,
      reason: this.generateSignalReason(),
    });

    if (this.ws) {
      this.ws.broadcastSignal(signal);
    }

    console.log('📊 Generated signal:', signal.type, signal.symbol, signal.action);
  }

  private generateNews(): void {
    const sources = ['CoinDesk', 'CoinTelegraph', 'The Block', 'Bloomberg Crypto', 'Reuters'];
    const sentiments = ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] as const;
    const titles = [
      'Bitcoin Reaches New All-Time High',
      'Ethereum 2.0 Upgrade Successfully Completed',
      'Major Exchange Announces New Trading Pairs',
      'Regulatory News Affects Crypto Market',
      'Institutional Investors Increase Bitcoin Holdings',
      'DeFi Protocol Launches New Features',
      'Market Analysis: Bullish Trend Continues',
      'New Partnership Announced in Blockchain Space',
      'Technical Analysis Shows Strong Support Levels',
      'Whale Activity Detected on Major Networks',
    ];

    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const newsItem = storage.addNews({
      title: titles[Math.floor(Math.random() * titles.length)] as string,
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      source: sources[Math.floor(Math.random() * sources.length)] as string,
      url: `https://example.com/news/${Date.now()}`,
      sentiment: randomSentiment!,
      sentimentScore: Math.random() * 2 - 1, // -1 to 1
      publishedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    });

    if (this.ws) {
      this.ws.broadcastNews(newsItem);
    }

    console.log('📰 Generated news:', newsItem.title, newsItem.sentiment);
  }

  private generateSignalReason(): string {
    const reasons = [
      'Strong bullish sentiment detected in news feed',
      'Positive price momentum with high volume',
      'Technical indicators showing oversold conditions',
      'Major news event with high impact score',
      'Social sentiment shifted dramatically',
      'Price breaking key resistance level',
      'Whale accumulation detected',
      'Correlation analysis suggests opportunity',
      'Risk-reward ratio favorable',
      'Multiple confirmations across strategies',
    ];

    return reasons[Math.floor(Math.random() * reasons.length)] as string;
  }
}
