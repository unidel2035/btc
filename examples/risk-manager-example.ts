/**
 * Пример использования модуля риск-менеджмента
 *
 * Запуск:
 * tsx examples/risk-manager-example.ts
 */

import { config } from 'dotenv';
import {
  RiskManager,
  PositionSizingMethod,
  PositionSide,
  StopLossType,
  type RiskConfig,
} from '../src/trading/risk/index.js';

config();

async function main() {
  console.info('🎯 Risk Manager Example\n');

  // 1. Создание конфигурации риск-менеджмента
  console.info('1️⃣  Creating risk configuration...\n');

  const riskConfig: RiskConfig = {
    maxPositionSize: 10, // Максимальный размер позиции: 10% от баланса
    maxPositions: 5, // Максимум 5 позиций одновременно
    maxDailyLoss: 5, // Дневной лимит убытков: 5%
    maxTotalDrawdown: 20, // Общий лимит просадки: 20%
    defaultStopLoss: 2, // Стоп-лосс по умолчанию: 2%
    defaultTakeProfit: 5, // Тейк-профит по умолчанию: 5%
    trailingStop: true, // Использовать трейлинг стоп
    trailingStopActivation: 3, // Активация трейлинг стопа при +3%
    trailingStopDistance: 1.5, // Дистанция трейлинг стопа: 1.5%
    maxAssetExposure: 15, // Максимальная экспозиция на один актив: 15%
    maxCorrelatedPositions: 2, // Максимум 2 коррелированных позиции
    correlationThreshold: 0.7, // Порог корреляции: 0.7
  };

  console.info('Risk Configuration:');
  console.info(JSON.stringify(riskConfig, null, 2));

  // 2. Инициализация Risk Manager
  console.info('\n2️⃣  Initializing Risk Manager...\n');

  const initialBalance = 10000; // Начальный баланс: $10,000
  const riskManager = new RiskManager(riskConfig, initialBalance, {
    enabled: true,
    channels: ['console'],
    warningThreshold: 80,
  });

  console.info(`✅ Risk Manager initialized with balance: $${initialBalance}`);

  // 3. Открытие позиции с фиксированным размером
  console.info('\n3️⃣  Opening position with FIXED sizing...\n');

  const position1 = await riskManager.openPosition({
    symbol: 'BTC/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.FIXED,
      balance: initialBalance,
      riskPerTrade: 2, // Риск 2% от баланса
      stopLossPercent: 2, // Стоп-лосс 2%
      entryPrice: 50000,
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 50000,
      percent: 2,
    },
    takeProfitParams: {
      entryPrice: 50000,
      levels: [
        { percent: 3, closePercent: 50 }, // Закрыть 50% позиции при +3%
        { percent: 5, closePercent: 30 }, // Закрыть 30% позиции при +5%
        { percent: 10, closePercent: 20 }, // Закрыть 20% позиции при +10%
      ],
    },
  });

  if (position1.success && position1.position) {
    console.info('✅ Position 1 opened successfully:');
    console.info(`   Symbol: ${position1.position.symbol}`);
    console.info(`   Side: ${position1.position.side}`);
    console.info(`   Entry: $${position1.position.entryPrice}`);
    console.info(`   Size: $${position1.position.size.toFixed(2)}`);
    console.info(`   Quantity: ${position1.position.quantity.toFixed(6)}`);
    console.info(`   Stop Loss: $${position1.position.stopLoss.toFixed(2)}`);
    console.info(`   Take Profit: $${position1.position.takeProfit.map((tp) => tp.toFixed(2)).join(', ')}`);
  } else {
    console.error(`❌ Failed to open position 1: ${position1.error}`);
  }

  // 4. Открытие позиции с Kelly Criterion
  console.info('\n4️⃣  Opening position with KELLY CRITERION...\n');

  const position2 = await riskManager.openPosition({
    symbol: 'ETH/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.KELLY,
      balance: initialBalance,
      riskPerTrade: 2,
      stopLossPercent: 2,
      entryPrice: 3000,
      winRate: 0.6, // 60% win rate
      avgWinLoss: 2.0, // Среднее отношение прибыли к убытку: 2:1
    },
    stopLossParams: {
      type: StopLossType.FIXED,
      entryPrice: 3000,
      percent: 2,
    },
  });

  if (position2.success && position2.position) {
    console.info('✅ Position 2 opened successfully:');
    console.info(`   Symbol: ${position2.position.symbol}`);
    console.info(`   Size: $${position2.position.size.toFixed(2)}`);
  }

  // 5. Открытие позиции с ATR-based stop loss
  console.info('\n5️⃣  Opening position with ATR-based stop loss...\n');

  const position3 = await riskManager.openPosition({
    symbol: 'SOL/USDT',
    side: PositionSide.LONG,
    sizingParams: {
      method: PositionSizingMethod.PERCENTAGE,
      balance: initialBalance,
      riskPerTrade: 2,
      stopLossPercent: 3,
      entryPrice: 100,
    },
    stopLossParams: {
      type: StopLossType.ATR_BASED,
      entryPrice: 100,
      atr: 5, // ATR = 5
      atrMultiplier: 2, // 2x ATR
    },
  });

  if (position3.success && position3.position) {
    console.info('✅ Position 3 opened successfully:');
    console.info(`   Symbol: ${position3.position.symbol}`);
    console.info(`   ATR-based Stop Loss: $${position3.position.stopLoss.toFixed(2)}`);
  }

  // 6. Добавление исторических данных для корреляционного анализа
  console.info('\n6️⃣  Adding market data for correlation analysis...\n');

  // Генерируем простые тестовые данные
  const generateMockData = (basePrice: number, periods: number) => {
    const data = [];
    let price = basePrice;

    for (let i = 0; i < periods; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% change
      price = price * (1 + change);

      data.push({
        timestamp: new Date(Date.now() - (periods - i) * 3600000), // Hourly data
        open: price,
        high: price * 1.01,
        low: price * 0.99,
        close: price,
        volume: Math.random() * 1000000,
      });
    }

    return data;
  };

  riskManager.addMarketData('BTC/USDT', generateMockData(50000, 30));
  riskManager.addMarketData('ETH/USDT', generateMockData(3000, 30));
  riskManager.addMarketData('SOL/USDT', generateMockData(100, 30));

  console.info('✅ Market data added for correlation analysis');

  // 7. Симуляция обновления цены и проверка стоп-лосса/тейк-профита
  console.info('\n7️⃣  Simulating price updates...\n');

  if (position1.position) {
    // Обновляем цену (небольшой профит)
    console.info('   Updating BTC/USDT to $51,000...');
    const update1 = await riskManager.updatePosition(position1.position.id, {
      currentPrice: 51000,
    });

    if (update1.position) {
      console.info(`   ✅ Position updated. Unrealized PnL: $${update1.position.unrealizedPnL.toFixed(2)}`);
    }

    // Обновляем цену (достижение первого тейк-профита: +3%)
    console.info('\n   Updating BTC/USDT to $51,500 (TP1 triggered)...');
    const update2 = await riskManager.updatePosition(position1.position.id, {
      currentPrice: 51500,
    });

    console.info(`   Actions taken: ${update2.actions.map((a) => a.type).join(', ')}`);
  }

  // 8. Получение статистики рисков
  console.info('\n8️⃣  Getting risk statistics...\n');

  const stats = riskManager.getStats();

  console.info('Risk Statistics:');
  console.info(`   Open Positions: ${stats.openPositions}`);
  console.info(`   Total Positions: ${stats.totalPositions}`);
  console.info(`   Total Exposure: $${stats.totalExposure.toFixed(2)} (${stats.totalExposurePercent.toFixed(2)}%)`);
  console.info(`   Daily PnL: $${stats.dailyPnL.toFixed(2)} (${stats.dailyPnLPercent.toFixed(2)}%)`);
  console.info(`   Total Drawdown: $${stats.totalDrawdown.toFixed(2)} (${stats.totalDrawdownPercent.toFixed(2)}%)`);
  console.info('\n   Asset Exposure:');
  for (const [asset, exposure] of Object.entries(stats.assetExposure)) {
    console.info(`     ${asset}: $${exposure.toFixed(2)}`);
  }

  // 9. Проверка предупреждений о лимитах
  console.info('\n9️⃣  Checking risk warnings...\n');

  await riskManager.checkWarnings();

  // 10. Получение событий риска
  console.info('\n🔟 Getting risk events...\n');

  const recentEvents = riskManager.getEvents(5);
  console.info(`Recent events (last 5):`);
  for (const event of recentEvents) {
    console.info(`   [${event.type}] ${event.message}`);
  }

  // 11. Закрытие позиции
  console.info('\n1️⃣1️⃣  Closing position...\n');

  if (position2.position) {
    const closeResult = await riskManager.closePosition(position2.position.id, 3100);

    if (closeResult.success) {
      console.info('✅ Position closed successfully:');
      console.info(`   Symbol: ${closeResult.position?.symbol}`);
      console.info(`   Realized PnL: $${closeResult.pnl?.toFixed(2)}`);
      console.info(`   Updated Balance: $${riskManager.getBalance().toFixed(2)}`);
    }
  }

  // 12. Итоговая статистика
  console.info('\n1️⃣2️⃣  Final statistics...\n');

  const finalStats = riskManager.getStats();
  const finalBalance = riskManager.getBalance();

  console.info('Final Statistics:');
  console.info(`   Final Balance: $${finalBalance.toFixed(2)}`);
  console.info(`   Total PnL: $${(finalBalance - initialBalance).toFixed(2)}`);
  console.info(`   Open Positions: ${finalStats.openPositions}`);
  console.info(`   Total Positions Opened: ${finalStats.totalPositions}`);

  console.info('\n✅ Example completed successfully!\n');
}

main().catch((error: Error) => {
  console.error('\n❌ Example failed:', error);
  process.exit(1);
});
