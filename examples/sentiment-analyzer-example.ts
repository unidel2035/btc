/**
 * Example: Sentiment Analysis Usage
 *
 * This example demonstrates how to use the sentiment analysis service
 * to analyze cryptocurrency news.
 */
import { config } from 'dotenv';
import { createSentimentClient } from '../src/analyzers/sentiment';
import { createNewsAnalyzer } from '../src/analyzers/sentiment/NewsAnalyzer';
import type { NewsItem } from '../src/collectors/news/types';

// Load environment variables
config();

/**
 * Example 1: Basic sentiment analysis
 */
async function basicAnalysis(): Promise<void> {
  console.info('\n=== Example 1: Basic Sentiment Analysis ===\n');

  const client = createSentimentClient();

  // Wait for service to be ready
  console.info('Waiting for sentiment service to be ready...');
  await client.waitForReady();
  console.info('✅ Service is ready!\n');

  // Analyze a positive news
  const positiveNews = 'Bitcoin surges 10% after major ETF approval from SEC';
  console.info('Analyzing positive news:', positiveNews);
  const result1 = await client.analyze(positiveNews, 'news');
  console.info('Result:', JSON.stringify(result1, null, 2));

  // Analyze a negative news
  const negativeNews = 'Cryptocurrency exchange hacked, $100M stolen in security breach';
  console.info('\nAnalyzing negative news:', negativeNews);
  const result2 = await client.analyze(negativeNews, 'news');
  console.info('Result:', JSON.stringify(result2, null, 2));

  // Analyze a neutral news
  const neutralNews = 'Bitcoin price remains stable around $45,000 mark';
  console.info('\nAnalyzing neutral news:', neutralNews);
  const result3 = await client.analyze(neutralNews, 'news');
  console.info('Result:', JSON.stringify(result3, null, 2));
}

/**
 * Example 2: Batch sentiment analysis
 */
async function batchAnalysis(): Promise<void> {
  console.info('\n=== Example 2: Batch Sentiment Analysis ===\n');

  const client = createSentimentClient();

  const newsTexts = [
    'Ethereum successfully completes major network upgrade',
    'Bitcoin mining difficulty reaches all-time high',
    'New regulations threaten crypto industry growth',
    'Major investment firm launches Bitcoin ETF',
    'Cardano announces partnership with Fortune 500 company',
  ];

  console.info('Analyzing batch of news items...');
  const results = await client.analyzeBatch(newsTexts, 'news');

  console.info(`\nProcessed ${results.processed} items:\n`);
  results.results.forEach((result, index) => {
    console.info(`${index + 1}. "${newsTexts[index]}"`);
    console.info(`   Sentiment: ${result.sentiment.toFixed(2)} (${result.label})`);
    console.info(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.info(`   Impact: ${result.impact}`);
    console.info(`   Entities: ${result.entities.join(', ') || 'none'}`);
    console.info(`   Keywords: ${result.keywords.join(', ')}\n`);
  });
}

/**
 * Example 3: News analyzer integration
 */
async function newsAnalyzerExample(): Promise<void> {
  console.info('\n=== Example 3: News Analyzer Integration ===\n');

  const analyzer = createNewsAnalyzer();

  // Check if service is available
  const available = await analyzer.isAvailable();
  if (!available) {
    console.error('Sentiment service is not available');
    return;
  }

  // Mock news items
  const newsItems: NewsItem[] = [
    {
      id: '1',
      source: 'coindesk',
      title: 'Bitcoin Rally Continues',
      content: 'Bitcoin price surged past $50,000 as institutional demand increases.',
      url: 'https://example.com/news1',
      publishedAt: new Date(),
      collectedAt: new Date(),
      tags: ['bitcoin', 'price'],
    },
    {
      id: '2',
      source: 'cointelegraph',
      title: 'Ethereum Network Congestion',
      content: 'High gas fees plague Ethereum network as demand spikes.',
      url: 'https://example.com/news2',
      publishedAt: new Date(),
      collectedAt: new Date(),
      tags: ['ethereum', 'network'],
    },
  ];

  console.info('Analyzing news items with sentiment...');
  const analyzed = await analyzer.analyzeNewsItems(newsItems);

  console.info('\nResults:\n');
  analyzed.forEach((item) => {
    console.info(`Title: ${item.title}`);
    console.info(`Sentiment: ${item.sentiment?.toFixed(2)}`);
    if (item.sentimentData) {
      console.info(`Label: ${item.sentimentData.label}`);
      console.info(`Confidence: ${(item.sentimentData.confidence * 100).toFixed(1)}%`);
      console.info(`Impact: ${item.sentimentData.impact}`);
      console.info(`Entities: ${item.sentimentData.entities.join(', ')}`);
      console.info(`Keywords: ${item.sentimentData.keywords.join(', ')}`);
    }
    console.info('---\n');
  });

  // Display cache stats
  const cacheStats = analyzer.getCacheStats();
  console.info(`Cache stats: ${cacheStats.size} items cached`);
}

/**
 * Example 4: Real-time news monitoring with sentiment
 */
async function realTimeMonitoring(): Promise<void> {
  console.info('\n=== Example 4: Real-time News Monitoring ===\n');

  const analyzer = createNewsAnalyzer();

  // Wait for service
  await analyzer.waitForReady();

  // Simulate incoming news stream
  const incomingNews: NewsItem[] = [
    {
      id: '1',
      source: 'coindesk',
      title: 'Breaking: Major Exchange Announces Bitcoin ETF',
      content:
        'In a groundbreaking move, one of the largest cryptocurrency exchanges announced the launch of a Bitcoin ETF product.',
      url: 'https://example.com/breaking1',
      publishedAt: new Date(),
      collectedAt: new Date(),
      tags: ['bitcoin', 'etf', 'breaking'],
    },
  ];

  console.info('Monitoring incoming news...\n');

  for (const news of incomingNews) {
    const analyzed = await analyzer.analyzeNewsItem(news);

    console.info(`📰 ${analyzed.title}`);
    console.info(`🎯 Sentiment: ${analyzed.sentiment?.toFixed(2)} (${analyzed.sentimentData?.label})`);
    console.info(`⚡ Impact: ${analyzed.sentimentData?.impact.toUpperCase()}`);

    // Alert on high impact news
    if (analyzed.sentimentData?.impact === 'high') {
      console.info('🚨 HIGH IMPACT NEWS DETECTED! 🚨');
    }

    console.info(`📊 Entities: ${analyzed.sentimentData?.entities.join(', ')}`);
    console.info(`🔑 Keywords: ${analyzed.sentimentData?.keywords.join(', ')}`);
    console.info('---\n');
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.info('🤖 Sentiment Analysis Examples\n');
    console.info('Make sure the sentiment service is running:');
    console.info('  docker-compose up sentiment\n');
    console.info('Or run locally:');
    console.info('  cd src/analyzers/sentiment/python');
    console.info('  python -m uvicorn main:app --reload\n');

    // Run examples
    await basicAnalysis();
    await batchAnalysis();
    await newsAnalyzerExample();
    await realTimeMonitoring();

    console.info('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
