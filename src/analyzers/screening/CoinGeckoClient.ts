import axios, { AxiosInstance } from 'axios';
import type {
  CoinGeckoMarketData,
  CoinGeckoCoinDetail,
  ProjectInfo,
  CryptoSector,
  Exchange,
} from './types.js';

/**
 * CoinGecko API Client
 *
 * Handles API calls to CoinGecko for cryptocurrency data
 */
export class CoinGeckoClient {
  private client: AxiosInstance;
  private baseURL = 'https://api.coingecko.com/api/v3';
  private requestDelay = 1200; // Delay between requests to avoid rate limiting (1.2s for free tier)

  constructor(apiKey?: string) {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: apiKey
        ? {
            'x-cg-pro-api-key': apiKey,
          }
        : {},
    });
  }

  /**
   * Delay to respect rate limits
   */
  private async delay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.requestDelay));
  }

  /**
   * Map CoinGecko category to our CryptoSector type
   */
  private mapCategory(categories: string[]): CryptoSector | null {
    const mapping: Record<string, CryptoSector> = {
      'artificial-intelligence': 'ai-crypto',
      'ai-crypto': 'ai-crypto',
      'decentralized-physical-infrastructure-networks-depin': 'depin',
      depin: 'depin',
      'real-world-assets-rwa': 'rwa',
      rwa: 'rwa',
      'modular-blockchain': 'modular-blockchain',
      'layer-2': 'l2-solutions',
      'optimistic-rollups': 'l2-solutions',
      'zero-knowledge-zk': 'l2-solutions',
      'decentralized-exchange': 'dex',
      dex: 'dex',
      'nft-fi': 'nft-fi',
      nft: 'nft-fi',
      'decentralized-finance-defi': 'defi',
      defi: 'defi',
      gaming: 'gaming',
      'play-to-earn': 'gaming',
      metaverse: 'metaverse',
      infrastructure: 'infrastructure',
      privacy: 'privacy',
      'privacy-coins': 'privacy',
      dao: 'dao',
      stablecoin: 'stablecoin',
      stablecoins: 'stablecoin',
    };

    for (const category of categories) {
      const normalized = category.toLowerCase();
      if (mapping[normalized]) {
        return mapping[normalized];
      }
    }
    return null;
  }

  /**
   * Map exchange identifier to our Exchange type
   */
  private mapExchange(exchangeId: string): Exchange | null {
    const normalized = exchangeId.toLowerCase();
    if (normalized.includes('binance')) return 'binance';
    if (normalized.includes('bybit')) return 'bybit';
    if (normalized.includes('okx') || normalized.includes('okex')) return 'okx';
    if (normalized.includes('kucoin')) return 'kucoin';
    if (normalized.includes('coinbase')) return 'coinbase';
    if (normalized.includes('kraken')) return 'kraken';
    return null;
  }

  /**
   * Get market data for top cryptocurrencies
   */
  async getMarketData(page = 1, perPage = 250, category?: string): Promise<CoinGeckoMarketData[]> {
    try {
      const params: Record<string, string | number | boolean> = {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: perPage,
        page,
        sparkline: false,
        price_change_percentage: '7d,30d,90d',
      };

      if (category) {
        params.category = category;
      }

      const response = await this.client.get<CoinGeckoMarketData[]>('/coins/markets', {
        params,
      });

      await this.delay();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific coin
   */
  async getCoinDetail(coinId: string): Promise<CoinGeckoCoinDetail> {
    try {
      const response = await this.client.get<CoinGeckoCoinDetail>(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: true,
          market_data: true,
          community_data: true,
          developer_data: true,
          sparkline: false,
        },
      });

      await this.delay();
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch coin detail for ${coinId}:`, error);
      throw error;
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<Array<{ category_id: string; name: string }>> {
    try {
      const response =
        await this.client.get<Array<{ category_id: string; name: string; market_cap: number }>>(
          '/coins/categories',
        );

      await this.delay();
      return response.data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
  }

  /**
   * Convert CoinGecko market data to our ProjectInfo format
   */
  async convertToProjectInfo(
    marketData: CoinGeckoMarketData,
    includeDetail = false,
  ): Promise<ProjectInfo> {
    let detail: CoinGeckoCoinDetail | null = null;
    let exchanges: Exchange[] = [];

    if (includeDetail) {
      try {
        detail = await this.getCoinDetail(marketData.id);

        // Extract exchanges from tickers
        const exchangeSet = new Set<Exchange>();
        for (const ticker of detail.tickers) {
          const exchange = this.mapExchange(ticker.market.identifier);
          if (exchange) {
            exchangeSet.add(exchange);
          }
        }
        exchanges = Array.from(exchangeSet);
      } catch (error) {
        console.warn(`Could not fetch detail for ${marketData.id}:`, error);
      }
    }

    return {
      id: marketData.id,
      symbol: marketData.symbol.toUpperCase(),
      name: marketData.name,
      marketCap: marketData.market_cap,
      marketCapRank: marketData.market_cap_rank,
      volume24h: marketData.total_volume,
      priceChange30d: marketData.price_change_percentage_30d_in_currency || 0,
      priceChange90d: marketData.price_change_percentage_90d_in_currency || 0,
      currentPrice: marketData.current_price,
      ath: marketData.ath,
      athDate: marketData.ath_date,
      athChangePercentage: marketData.ath_change_percentage,
      circulatingSupply: marketData.circulating_supply,
      totalSupply: marketData.total_supply,
      maxSupply: marketData.max_supply,
      fullyDilutedValuation: marketData.fully_diluted_valuation,
      sector: detail ? this.mapCategory(detail.categories) : null,
      exchanges,
      image: marketData.image,
    };
  }

  /**
   * Get projects by category with full details
   */
  async getProjectsByCategory(category: string, maxProjects = 50): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];
    const perPage = 250;
    let page = 1;
    let fetched = 0;

    while (fetched < maxProjects) {
      const marketData = await this.getMarketData(page, perPage, category);

      if (marketData.length === 0) {
        break;
      }

      for (const data of marketData) {
        if (fetched >= maxProjects) break;

        const project = await this.convertToProjectInfo(data, true);
        projects.push(project);
        fetched++;
      }

      page++;
    }

    return projects;
  }

  /**
   * Search for coins by query
   */
  async searchCoins(query: string): Promise<Array<{ id: string; name: string; symbol: string }>> {
    try {
      const response = await this.client.get<{
        coins: Array<{ id: string; name: string; symbol: string }>;
      }>('/search', {
        params: { query },
      });

      await this.delay();
      return response.data.coins;
    } catch (error) {
      console.error('Failed to search coins:', error);
      throw error;
    }
  }

  /**
   * Ping the API to check if it's reachable
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/ping');
      return true;
    } catch (error) {
      console.error('CoinGecko API ping failed:', error);
      return false;
    }
  }
}
