/**
 * CoinGecko API Client for crypto market data
 */

import axios, { AxiosInstance } from 'axios';
import type {
  CoinGeckoMarketData,
  CoinGeckoDetailedData,
  CoinGeckoCategoryData,
} from '../types/index.js';

export class CoinGeckoClient {
  private client: AxiosInstance;
  private requestDelay: number = 1200; // Rate limit: ~50 requests/minute for free tier
  private lastRequestTime: number = 0;

  constructor(apiKey?: string) {
    // apiKey is used in the client initialization

    this.client = axios.create({
      baseURL: apiKey
        ? 'https://pro-api.coingecko.com/api/v3'
        : 'https://api.coingecko.com/api/v3',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        ...(apiKey && { 'x-cg-pro-api-key': apiKey }),
      },
    });
  }

  /**
   * Rate limiting: Wait before making request
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get market data for multiple coins
   */
  async getMarketData(params: {
    vsCurrency?: string;
    category?: string;
    order?: string;
    perPage?: number;
    page?: number;
    sparkline?: boolean;
    priceChangePercentage?: string;
  } = {}): Promise<CoinGeckoMarketData[]> {
    await this.rateLimit();

    const response = await this.client.get<CoinGeckoMarketData[]>('/coins/markets', {
      params: {
        vs_currency: params.vsCurrency || 'usd',
        category: params.category,
        order: params.order || 'market_cap_desc',
        per_page: params.perPage || 100,
        page: params.page || 1,
        sparkline: params.sparkline || false,
        price_change_percentage: params.priceChangePercentage || '24h,7d,30d,90d',
      },
    });

    return response.data;
  }

  /**
   * Get detailed data for a specific coin
   */
  async getCoinDetails(coinId: string): Promise<CoinGeckoDetailedData> {
    await this.rateLimit();

    const response = await this.client.get<CoinGeckoDetailedData>(`/coins/${coinId}`, {
      params: {
        localization: false,
        tickers: true,
        market_data: true,
        community_data: true,
        developer_data: true,
        sparkline: false,
      },
    });

    return response.data;
  }

  /**
   * Get list of all categories
   */
  async getCategories(): Promise<CoinGeckoCategoryData[]> {
    await this.rateLimit();

    const response = await this.client.get<CoinGeckoCategoryData[]>('/coins/categories');

    return response.data;
  }

  /**
   * Get coins by category
   */
  async getCoinsByCategory(categoryId: string, limit: number = 100): Promise<CoinGeckoMarketData[]> {
    return this.getMarketData({
      category: categoryId,
      perPage: limit,
      page: 1,
    });
  }

  /**
   * Get trending coins
   */
  async getTrendingCoins(): Promise<any> {
    await this.rateLimit();

    const response = await this.client.get('/search/trending');
    return response.data;
  }

  /**
   * Get global crypto market data
   */
  async getGlobalData(): Promise<any> {
    await this.rateLimit();

    const response = await this.client.get('/global');
    return response.data;
  }

  /**
   * Batch get detailed data for multiple coins (with rate limiting)
   */
  async batchGetCoinDetails(coinIds: string[]): Promise<CoinGeckoDetailedData[]> {
    const results: CoinGeckoDetailedData[] = [];

    for (const coinId of coinIds) {
      try {
        const details = await this.getCoinDetails(coinId);
        results.push(details);
      } catch (error) {
        console.error(`Failed to fetch details for ${coinId}:`, error);
        // Continue with other coins
      }
    }

    return results;
  }

  /**
   * Search for coins
   */
  async searchCoins(query: string): Promise<any> {
    await this.rateLimit();

    const response = await this.client.get('/search', {
      params: { query },
    });

    return response.data;
  }

  /**
   * Get coins list with basic info
   */
  async getCoinsList(): Promise<Array<{ id: string; symbol: string; name: string }>> {
    await this.rateLimit();

    const response = await this.client.get('/coins/list');
    return response.data;
  }

  /**
   * Get market chart data for a coin
   */
  async getMarketChart(
    coinId: string,
    vsCurrency: string = 'usd',
    days: number = 90
  ): Promise<any> {
    await this.rateLimit();

    const response = await this.client.get(`/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: vsCurrency,
        days,
      },
    });

    return response.data;
  }

  /**
   * Helper: Filter coins by exchanges
   */
  filterByExchanges(
    coins: CoinGeckoDetailedData[],
    requiredExchanges: string[],
    minListings: number = 2
  ): CoinGeckoDetailedData[] {
    return coins.filter(coin => {
      const exchanges = new Set(
        coin.tickers.map(ticker => ticker.market.identifier.toLowerCase())
      );

      const matchingExchanges = requiredExchanges.filter(exchange =>
        exchanges.has(exchange.toLowerCase())
      );

      return matchingExchanges.length >= minListings;
    });
  }

  /**
   * Helper: Calculate price to ATH ratio
   */
  calculatePriceToAth(currentPrice: number, ath: number): number {
    return currentPrice / ath;
  }

  /**
   * Helper: Check if coin is in required exchanges
   */
  hasRequiredExchanges(
    tickers: CoinGeckoDetailedData['tickers'],
    requiredExchanges: string[]
  ): boolean {
    const exchanges = new Set(
      tickers.map(ticker => ticker.market.identifier.toLowerCase())
    );

    return requiredExchanges.some(exchange =>
      exchanges.has(exchange.toLowerCase())
    );
  }
}

export default CoinGeckoClient;
