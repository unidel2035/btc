#!/usr/bin/env tsx

/**
 * Integram Database Setup Script
 *
 * Этот скрипт подключается к Интеграм и предоставляет инструкции
 * по созданию необходимых таблиц через веб-интерфейс
 */

import { config } from 'dotenv';
import { IntegramClient } from '../src/database/integram/IntegramClient.js';

config();

const INTEGRAM_URL = process.env.INTEGRAM_URL || 'https://интеграм.рф';
const INTEGRAM_DATABASE = process.env.INTEGRAM_DATABASE || 'bts';
const INTEGRAM_LOGIN = process.env.INTEGRAM_LOGIN || 'd';
const INTEGRAM_PASSWORD = process.env.INTEGRAM_PASSWORD || 'd';

console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║      🗄️  Integram Database Setup              ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

async function testConnection() {
  console.log('📡 Testing connection to Integram...');
  console.log(`   Server: ${INTEGRAM_URL}`);
  console.log(`   Database: ${INTEGRAM_DATABASE}`);
  console.log(`   Login: ${INTEGRAM_LOGIN}`);
  console.log('');

  const client = new IntegramClient({
    serverURL: INTEGRAM_URL,
    database: INTEGRAM_DATABASE,
    login: INTEGRAM_LOGIN,
    password: INTEGRAM_PASSWORD,
  });

  try {
    await client.authenticate();
    console.log('✅ Connection successful!');
    console.log('');

    const info = client.getDatabaseInfo();
    console.log('📊 Database Info:');
    console.log(`   URL: ${info.serverURL}/${info.database}`);
    console.log(`   Web Interface: ${info.serverURL}`);
    console.log('');

    return client;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    console.error('');
    console.error('Please check your credentials in .env file:');
    console.error('   INTEGRAM_URL');
    console.error('   INTEGRAM_DATABASE');
    console.error('   INTEGRAM_LOGIN');
    console.error('   INTEGRAM_PASSWORD');
    console.error('');
    process.exit(1);
  }
}

function printTableInstructions() {
  console.log('📋 Table Creation Instructions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Please create the following tables in Integram web interface:');
  console.log(`${INTEGRAM_URL}`);
  console.log('');

  console.log('1️⃣  LOOKUP TABLES (Справочники):');
  console.log('');

  console.log('   📌 PositionSide');
  console.log('      - LONG');
  console.log('      - SHORT');
  console.log('');

  console.log('   📌 PositionStatus');
  console.log('      - OPEN');
  console.log('      - CLOSED');
  console.log('      - PENDING');
  console.log('');

  console.log('   📌 SignalAction');
  console.log('      - BUY');
  console.log('      - SELL');
  console.log('      - HOLD');
  console.log('');

  console.log('   📌 Sentiment');
  console.log('      - POSITIVE');
  console.log('      - NEGATIVE');
  console.log('      - NEUTRAL');
  console.log('');

  console.log('2️⃣  MAIN TABLES:');
  console.log('');

  console.log('   📊 Positions');
  console.log('      Columns:');
  console.log('      - symbol (SHORT) - Символ торговой пары');
  console.log('      - side (REFERENCE → PositionSide) - LONG/SHORT');
  console.log('      - size (NUMBER) - Размер позиции');
  console.log('      - entryPrice (NUMBER) - Цена входа');
  console.log('      - currentPrice (NUMBER) - Текущая цена');
  console.log('      - stopLoss (NUMBER) - Стоп-лосс');
  console.log('      - takeProfit (NUMBER) - Тейк-профит');
  console.log('      - pnl (NUMBER) - P&L');
  console.log('      - pnlPercent (NUMBER) - P&L в процентах');
  console.log('      - openTime (DATETIME) - Время открытия');
  console.log('      - closeTime (DATETIME) - Время закрытия');
  console.log('      - status (REFERENCE → PositionStatus) - Статус');
  console.log('      - updatedAt (DATETIME) - Время обновления');
  console.log('');

  console.log('   📊 Signals');
  console.log('      Columns:');
  console.log('      - type (SHORT) - Тип стратегии');
  console.log('      - source (SHORT) - Источник');
  console.log('      - symbol (SHORT) - Символ');
  console.log('      - action (REFERENCE → SignalAction) - BUY/SELL/HOLD');
  console.log('      - strength (NUMBER) - Сила сигнала (0-100)');
  console.log('      - confidence (NUMBER) - Уверенность (0-1)');
  console.log('      - price (NUMBER) - Рекомендуемая цена');
  console.log('      - reason (LONG) - Причина');
  console.log('      - timestamp (DATETIME) - Время создания');
  console.log('');

  console.log('   📊 News');
  console.log('      Columns:');
  console.log('      - title (SHORT) - Заголовок');
  console.log('      - content (LONG) - Содержание');
  console.log('      - source (SHORT) - Источник');
  console.log('      - url (SHORT) - URL');
  console.log('      - sentiment (REFERENCE → Sentiment) - Настроение');
  console.log('      - sentimentScore (NUMBER) - Оценка (-1 to 1)');
  console.log('      - publishedAt (DATETIME) - Дата публикации');
  console.log('      - fetchedAt (DATETIME) - Дата сбора');
  console.log('');

  console.log('   📊 TradeHistory');
  console.log('      Columns:');
  console.log('      - symbol (SHORT) - Символ');
  console.log('      - side (REFERENCE → PositionSide) - BUY/SELL');
  console.log('      - entryPrice (NUMBER) - Цена входа');
  console.log('      - exitPrice (NUMBER) - Цена выхода');
  console.log('      - quantity (NUMBER) - Количество');
  console.log('      - pnl (NUMBER) - P&L');
  console.log('      - openTime (DATETIME) - Время открытия');
  console.log('      - closeTime (DATETIME) - Время закрытия');
  console.log('      - reason (LONG) - Причина закрытия');
  console.log('');

  console.log('   📊 EquityHistory');
  console.log('      Columns:');
  console.log('      - equity (NUMBER) - Капитал');
  console.log('      - balance (NUMBER) - Баланс');
  console.log('      - timestamp (DATETIME) - Время');
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('📝 After creating tables, update .env with table IDs:');
  console.log('');
  console.log('   INTEGRAM_TYPE_POSITIONS=<ID>');
  console.log('   INTEGRAM_TYPE_SIGNALS=<ID>');
  console.log('   INTEGRAM_TYPE_NEWS=<ID>');
  console.log('   INTEGRAM_TYPE_TRADE_HISTORY=<ID>');
  console.log('   INTEGRAM_TYPE_EQUITY_HISTORY=<ID>');
  console.log('   INTEGRAM_TYPE_POSITION_SIDE=<ID>');
  console.log('   INTEGRAM_TYPE_POSITION_STATUS=<ID>');
  console.log('   INTEGRAM_TYPE_SIGNAL_ACTION=<ID>');
  console.log('   INTEGRAM_TYPE_SENTIMENT=<ID>');
  console.log('');
  console.log('💡 To find table IDs, inspect the table in web interface');
  console.log('   or use browser dev tools to see network requests');
  console.log('');
}

async function listExistingTables(client: IntegramClient) {
  console.log('🔍 Checking for existing data...');
  console.log('');

  // Проверяем каждую таблицу
  const tables = [
    { name: 'POSITIONS', envVar: 'INTEGRAM_TYPE_POSITIONS' },
    { name: 'SIGNALS', envVar: 'INTEGRAM_TYPE_SIGNALS' },
    { name: 'NEWS', envVar: 'INTEGRAM_TYPE_NEWS' },
    { name: 'TRADE_HISTORY', envVar: 'INTEGRAM_TYPE_TRADE_HISTORY' },
    { name: 'EQUITY_HISTORY', envVar: 'INTEGRAM_TYPE_EQUITY_HISTORY' },
  ];

  for (const table of tables) {
    const typeId = parseInt(process.env[table.envVar] || '0');
    if (typeId > 0) {
      try {
        const objects = await client.getObjects(typeId, 1);
        console.log(`   ✅ ${table.name} (ID: ${typeId}): ${objects.length > 0 ? 'has data' : 'empty'}`);
      } catch (error) {
        console.log(`   ⚠️  ${table.name} (ID: ${typeId}): error checking`);
      }
    } else {
      console.log(`   ⚠️  ${table.name}: not configured in .env`);
    }
  }

  console.log('');
}

async function main() {
  const client = await testConnection();

  await listExistingTables(client);

  printTableInstructions();

  console.log('✨ Setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('   1. Create tables in Integram web interface');
  console.log('   2. Update .env with table IDs');
  console.log('   3. Run: npm run dashboard');
  console.log('');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
