/**
 * Пример использования Smart Stop Loss & Take Profit системы
 *
 * Запуск: tsx examples/smart-exit-example.ts
 */

import {
  SmartStopLoss,
  SmartTakeProfit,
  SmartExitManager,
  TechnicalIndicators,
  StopLossType,
  TakeProfitType,
  PositionSide,
  PositionStatus,
} from '../src/trading/risk/index.js';
import type {
  StopLossParams,
  TakeProfitParams,
  Position,
  OHLCVData,
  SmartExitConfig,
} from '../src/trading/risk/index.js';

console.info('🚀 Smart Stop Loss & Take Profit Example\n');

// ============================================================================
// 1. Создание тестовых рыночных данных
// ============================================================================

console.info('📊 Creating market data...');

function createMarketData(count: number, basePrice: number): OHLCVData[] {
  const data: OHLCVData[] = [];
  let price = basePrice;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 500;
    price = Math.max(price + change, basePrice * 0.9);

    data.push({
      timestamp: new Date(Date.now() - (count - i) * 3600000),
      open: price,
      high: price + Math.random() * 300,
      low: price - Math.random() * 300,
      close: price + change,
      volume: 1000000 + Math.random() * 500000,
    });
  }

  return data;
}

const btcData = createMarketData(100, 45000);
console.info(`   Generated ${btcData.length} OHLCV candles for BTC/USDT\n`);

// ============================================================================
// 2. Использование Technical Indicators
// ============================================================================

console.info('📈 Technical Indicators:\n');

const atr = TechnicalIndicators.calculateATR(btcData, 14);
console.info(`   ATR(14): $${atr.toFixed(2)}`);

const avgATR = TechnicalIndicators.calculateAverageATR(btcData, 14, 50);
console.info(`   Average ATR: $${avgATR.toFixed(2)}`);

const adaptiveMultiplier = TechnicalIndicators.calculateAdaptiveATRMultiplier(atr, avgATR);
console.info(`   Adaptive ATR Multiplier: ${adaptiveMultiplier}x\n`);

const support = TechnicalIndicators.findNearestSupport(btcData, 45000, 50);
console.info(`   Nearest Support: $${support.toFixed(2)}`);

const resistance = TechnicalIndicators.findNearestResistance(btcData, 45000, 50);
console.info(`   Nearest Resistance: $${resistance.toFixed(2)}\n`);

const fibLevels = TechnicalIndicators.calculateFibonacciExtension(44000, 46000, 'long');
console.info('   Fibonacci Extension Levels:');
fibLevels.forEach((level, i) => {
  const labels = ['61.8%', '100%', '161.8%', '261.8%'];
  console.info(`     ${labels[i]}: $${level.toFixed(2)}`);
});
console.info();

// ============================================================================
// 3. SmartStopLoss Examples
// ============================================================================

console.info('🛡️  Smart Stop Loss Examples:\n');

// 3.1 Fixed Stop Loss
const fixedSL: StopLossParams = {
  type: StopLossType.FIXED,
  entryPrice: 45000,
  percent: 2,
  side: 'long',
};
console.info(`   Fixed SL (2%): $${SmartStopLoss.calculateStopLoss(fixedSL).toFixed(2)}`);

// 3.2 ATR-based Stop Loss with adaptive multiplier
const atrSL: StopLossParams = {
  type: StopLossType.ATR_BASED,
  entryPrice: 45000,
  side: 'long',
  ohlcvData: btcData,
  avgATR,
};
console.info(
  `   ATR-based SL (adaptive): $${SmartStopLoss.calculateStopLoss(atrSL).toFixed(2)}`,
);

// 3.3 Structure-based Stop Loss
const structureSL: StopLossParams = {
  type: StopLossType.STRUCTURE_BASED,
  entryPrice: 45000,
  side: 'long',
  ohlcvData: btcData,
  lookback: 50,
};
console.info(
  `   Structure-based SL: $${SmartStopLoss.calculateStopLoss(structureSL).toFixed(2)}`,
);

// 3.4 Parabolic SAR Stop Loss
const sarSL: StopLossParams = {
  type: StopLossType.PARABOLIC_SAR,
  entryPrice: 45000,
  ohlcvData: btcData,
  acceleration: 0.02,
  maximum: 0.2,
};
console.info(`   Parabolic SAR SL: $${SmartStopLoss.calculateStopLoss(sarSL).toFixed(2)}\n`);

// ============================================================================
// 4. SmartTakeProfit Examples
// ============================================================================

console.info('🎯 Smart Take Profit Examples:\n');

// 4.1 Fixed Take Profit
const fixedTP: TakeProfitParams = {
  type: TakeProfitType.FIXED,
  entryPrice: 45000,
  side: 'long',
  levels: [{ percent: 10, closePercent: 100 }],
};
const fixedTPLevels = SmartTakeProfit.calculateLevels(fixedTP);
console.info(`   Fixed TP (10%): $${fixedTPLevels[0]!.toFixed(2)}`);

// 4.2 Multiple Levels Take Profit
const multipleLevelsTP: TakeProfitParams = {
  type: TakeProfitType.MULTIPLE_LEVELS,
  entryPrice: 45000,
  side: 'long',
  levels: [
    { percent: 5, closePercent: 50 }, // Close 50% at +5%
    { percent: 10, closePercent: 30 }, // Close 30% at +10%
    { percent: 15, closePercent: 20 }, // Close 20% at +15%
  ],
};
const multipleTPLevels = SmartTakeProfit.calculateLevels(multipleLevelsTP);
console.info('   Multiple TP Levels:');
console.info(`     TP1 (+5%, close 50%): $${multipleTPLevels[0]!.toFixed(2)}`);
console.info(`     TP2 (+10%, close 30%): $${multipleTPLevels[1]!.toFixed(2)}`);
console.info(`     TP3 (+15%, close 20%): $${multipleTPLevels[2]!.toFixed(2)}`);

// 4.3 Risk/Reward Ratio Take Profit
const rrTP: TakeProfitParams = {
  type: TakeProfitType.RISK_REWARD,
  entryPrice: 45000,
  stopLoss: 44000,
  riskRewardRatio: 2.0,
  side: 'long',
};
const rrTPLevels = SmartTakeProfit.calculateLevels(rrTP);
console.info(`   Risk/Reward TP (1:2): $${rrTPLevels[0]!.toFixed(2)}`);

// 4.4 Fibonacci Extension Take Profit
const fibTP: TakeProfitParams = {
  type: TakeProfitType.FIBONACCI,
  entryPrice: 45000,
  swingLow: 44000,
  swingHigh: 46000,
  side: 'long',
};
const fibTPLevels = SmartTakeProfit.calculateLevels(fibTP);
console.info('   Fibonacci TP Levels:');
fibTPLevels.forEach((level, i) => {
  const labels = ['61.8%', '100%', '161.8%', '261.8%'];
  console.info(`     ${labels[i]}: $${level.toFixed(2)}`);
});
console.info();

// ============================================================================
// 5. SmartExitManager - Полная интеграция
// ============================================================================

console.info('🎮 Smart Exit Manager Integration:\n');

// Создаем конфигурацию Smart Exit
const smartExitConfig: SmartExitConfig = {
  breakevenEnabled: true,
  breakevenActivationPercent: 2,
  steppedTrailingEnabled: true,
  timeBasedExitEnabled: true,
  maxHoldingTime: 72, // 3 days
  minProfitForTimeExit: 3,
  volatilityAdaptationEnabled: true,
  partialProfitEnabled: true,
};

const exitManager = new SmartExitManager(smartExitConfig);
exitManager.updateMarketData('BTC/USDT', btcData);

// Создаем позицию с Stepped Trailing Stop
const position: Position = {
  id: 'BTC-LONG-001',
  symbol: 'BTC/USDT',
  side: PositionSide.LONG,
  status: PositionStatus.OPEN,
  entryPrice: 45000,
  currentPrice: 45000,
  size: 10000,
  quantity: 0.2222,
  remainingQuantity: 0.2222,
  stopLoss: SmartStopLoss.calculateStopLoss(atrSL),
  takeProfit: multipleTPLevels,
  takeProfitLevels: multipleLevelsTP.levels,
  stopLossType: StopLossType.ATR_BASED,
  takeProfitType: TakeProfitType.MULTIPLE_LEVELS,
  trailingStopActive: true,
  steppedTrailingSteps: SmartExitManager.createDefaultSteppedTrailing(),
  smartExitConfig,
  unrealizedPnL: 0,
  realizedPnL: 0,
  openedAt: new Date(),
  lastUpdatedAt: new Date(),
};

console.info('   Initial Position:');
console.info(`     Entry: $${position.entryPrice.toFixed(2)}`);
console.info(`     Stop Loss: $${position.stopLoss.toFixed(2)}`);
console.info(`     Take Profit Levels: ${position.takeProfit.map((tp) => `$${tp.toFixed(2)}`).join(', ')}\n`);

// Симулируем обновления цены
async function simulatePriceUpdates() {
  const prices = [
    { price: 45900, description: '+2% (Breakeven activation)' },
    { price: 47250, description: '+5% (TP1 & Stepped trailing)' },
    { price: 49500, description: '+10% (TP2)' },
  ];

  for (const { price, description } of prices) {
    console.info(`   📍 Price Update: $${price.toFixed(2)} ${description}`);

    const result = await exitManager.updatePosition(position, price);

    if (result.actions.length > 0) {
      console.info('     Actions:');
      result.actions.forEach((action) => {
        console.info(`       • ${action.message}`);
      });
    }

    console.info(
      `     Current SL: $${result.position.stopLoss.toFixed(2)}, PnL: $${result.position.unrealizedPnL.toFixed(2)}`,
    );

    if (result.shouldClose) {
      console.info(`     ⚠️  Position should close: ${result.closeReason}\n`);
      break;
    }

    console.info();
  }

  // Получаем рекомендации
  console.info('   💡 Exit Recommendations:');
  const recommendations = exitManager.getExitRecommendations(position, position.currentPrice);
  recommendations.forEach((rec) => {
    console.info(`     • ${rec}`);
  });
  console.info();

  // Проверяем emergency exit conditions
  console.info('   🚨 Emergency Exit Check:');
  const emergencyCheck = exitManager.shouldEmergencyExit(position, position.currentPrice, {
    volumeDropPercent: 60,
    adverseNews: false,
  });
  if (emergencyCheck.shouldExit) {
    console.info(`     ⚠️  Emergency exit required: ${emergencyCheck.reason}`);
  } else {
    console.info('     ✅ No emergency exit needed');
  }
  console.info();
}

// Запускаем симуляцию
simulatePriceUpdates().then(() => {
  console.info('✅ Smart Exit Example Complete!\n');
});
