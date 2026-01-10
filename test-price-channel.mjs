/**
 * Демонстрация работы Price Channel Breakout Strategy
 */

import { PriceChannelStrategy } from './dist/trading/strategies/PriceChannelStrategy.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   PRICE CHANNEL BREAKOUT STRATEGY - DEMO                ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Создаем стратегию
const strategy = new PriceChannelStrategy({
  channelPeriod: 18,
  minChannelPercent: 0.5,
  maxChannelPercent: 3,
  breakoutThreshold: 0.1,
  requireSignalConfirmation: false,
});

console.log('📊 Параметры стратегии:');
console.log(`   - Период канала: 18`);
console.log(`   - Мин. ширина канала: 0.5%`);
console.log(`   - Макс. ширина канала: 3%`);
console.log(`   - Порог пробоя: 0.1%`);
console.log('');

// Создаем историю цен (симуляция движения цены)
console.log('🔄 Фаза 1: Накопление истории цен (18 периодов)');
console.log('   Симулируем движение цены от 49900 до 50400...\n');

const priceData = [
  // Рост
  { price: 49900, high: 49950, low: 49850 },
  { price: 50000, high: 50075, low: 49925 },
  { price: 50100, high: 50175, low: 50025 },
  { price: 50200, high: 50275, low: 50125 },
  { price: 50300, high: 50375, low: 50225 },
  { price: 50400, high: 50475, low: 50325 },
  // Коррекция
  { price: 50350, high: 50425, low: 50275 },
  { price: 50300, high: 50375, low: 50225 },
  { price: 50250, high: 50325, low: 50175 },
  { price: 50200, high: 50275, low: 50125 },
  { price: 50150, high: 50225, low: 50075 },
  { price: 50100, high: 50175, low: 50025 },
  { price: 50050, high: 50125, low: 49975 },
  { price: 50000, high: 50075, low: 49925 },
  { price: 49950, high: 50025, low: 49875 },
  { price: 49900, high: 49975, low: 49825 },
  // Отскок
  { price: 49950, high: 50025, low: 49875 },
  { price: 50000, high: 50075, low: 49925 },
];

// Добавляем историю
for (let i = 0; i < priceData.length; i++) {
  const data = priceData[i];
  const marketData = {
    symbol: 'BTC/USDT',
    price: data.price,
    volume: 1000000,
    timestamp: new Date(Date.now() - (priceData.length - i) * 3600000), // 1 час назад за период
    ohlc: {
      open: data.price - 25,
      high: data.high,
      low: data.low,
      close: data.price,
    },
  };

  strategy.analyze(marketData, []);

  if (i === priceData.length - 1) {
    console.log(`   Период ${i + 1}: $${data.price.toLocaleString()} (high: $${data.high}, low: $${data.low})`);
  } else if (i % 5 === 0) {
    console.log(`   Период ${i + 1}: $${data.price.toLocaleString()}`);
  }
}

// Получаем текущий канал
const channel = strategy.getCurrentChannel();
console.log('\n📈 Построенный ценовой канал:');
console.log(`   Верхняя граница: $${channel.high.toLocaleString()}`);
console.log(`   Нижняя граница:  $${channel.low.toLocaleString()}`);
console.log(`   Ширина канала:   $${channel.width.toFixed(2)} (${channel.widthPercent.toFixed(2)}%)`);
console.log('');

// Тест 1: Цена внутри канала
console.log('🧪 Тест 1: Цена внутри канала');
const insideData = {
  symbol: 'BTC/USDT',
  price: 50100,
  volume: 1000000,
  timestamp: new Date(),
  volatility: 0.1,
};

console.log(`   Текущая цена: $${insideData.price.toLocaleString()}`);
const decision1 = strategy.analyze(insideData, []);
console.log(`   Результат: ${decision1 ? '⚠️ Сигнал сгенерирован' : '✅ Нет сигнала (ожидаемо)'}\n`);

// Тест 2: Пробой верхней границы (LONG)
console.log('🧪 Тест 2: Пробой верхней границы');
const upperBreakout = channel.high + (channel.width * 0.15); // Пробой на 15% от ширины канала
const breakoutData = {
  symbol: 'BTC/USDT',
  price: upperBreakout,
  volume: 2000000,
  timestamp: new Date(),
  volatility: 0.12,
};

console.log(`   Текущая цена: $${breakoutData.price.toLocaleString()}`);
console.log(`   Пробой на: $${(upperBreakout - channel.high).toFixed(2)}`);

const decision2 = strategy.analyze(breakoutData, []);

if (decision2) {
  console.log('   ✅ СИГНАЛ СГЕНЕРИРОВАН!');
  console.log(`   ├─ Направление: ${decision2.direction.toUpperCase()}`);
  console.log(`   ├─ Уверенность: ${(decision2.confidence * 100).toFixed(1)}%`);
  console.log(`   ├─ Размер позиции: ${decision2.positionSize.toFixed(2)}%`);
  console.log(`   ├─ Цена входа: $${decision2.entryPrice.toLocaleString()}`);
  console.log(`   ├─ Stop Loss: $${decision2.stopLoss.toLocaleString()}`);
  console.log(`   ├─ Take Profit: $${decision2.takeProfit.toLocaleString()}`);
  console.log(`   └─ Причина: ${decision2.reason}`);
} else {
  console.log('   ❌ Сигнал НЕ сгенерирован\n');
}
console.log('');

// Тест 3: Пробой нижней границы (SHORT)
console.log('🧪 Тест 3: Пробой нижней границы');
const lowerBreakout = channel.low - (channel.width * 0.15);
const shortData = {
  symbol: 'BTC/USDT',
  price: lowerBreakout,
  volume: 2000000,
  timestamp: new Date(),
  volatility: 0.12,
};

console.log(`   Текущая цена: $${shortData.price.toLocaleString()}`);
console.log(`   Пробой на: $${(channel.low - lowerBreakout).toFixed(2)}`);

const decision3 = strategy.analyze(shortData, []);

if (decision3) {
  console.log('   ✅ СИГНАЛ СГЕНЕРИРОВАН!');
  console.log(`   ├─ Направление: ${decision3.direction.toUpperCase()}`);
  console.log(`   ├─ Уверенность: ${(decision3.confidence * 100).toFixed(1)}%`);
  console.log(`   ├─ Размер позиции: ${decision3.positionSize.toFixed(2)}%`);
  console.log(`   ├─ Цена входа: $${decision3.entryPrice.toLocaleString()}`);
  console.log(`   ├─ Stop Loss: $${decision3.stopLoss.toLocaleString()}`);
  console.log(`   ├─ Take Profit: $${decision3.takeProfit.toLocaleString()}`);
  console.log(`   └─ Причина: ${decision3.reason}`);
} else {
  console.log('   ❌ Сигнал НЕ сгенерирован\n');
}

// Статистика
console.log('\n📊 Статистика стратегии:');
const stats = strategy.getStats();
console.log(`   Всего сигналов: ${stats.totalSignals}`);
console.log(`   Всего сделок: ${stats.totalTrades}`);
console.log(`   Последнее выполнение: ${stats.lastExecuted ? new Date(stats.lastExecuted).toLocaleString() : 'Никогда'}`);

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║   ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА                                 ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');
