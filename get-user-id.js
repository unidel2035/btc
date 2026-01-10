/**
 * Простой скрипт для получения Telegram User ID
 * Запустите скрипт и отправьте любое сообщение боту в Telegram
 */

import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

console.log('🤖 Запуск бота для получения User ID...\n');
console.log('📱 Откройте Telegram и отправьте любое сообщение боту @bts_ai_agent_bot\n');
console.log('═'.repeat(60));

const bot = new Telegraf(botToken);

// Обработчик для любого сообщения
bot.on('message', async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || 'без username';
  const firstName = ctx.from.first_name || '';
  const lastName = ctx.from.last_name || '';

  console.log('\n✅ Получено сообщение от пользователя:');
  console.log(`   User ID: ${userId}`);
  console.log(`   Username: @${username}`);
  console.log(`   Имя: ${firstName} ${lastName}`);
  console.log('\n📋 Добавьте эту строку в .env файл:');
  console.log(`   TELEGRAM_USER_ID=${userId}`);
  console.log('\n' + '═'.repeat(60));

  await ctx.reply(
    `✅ Ваш User ID: ${userId}\n\n` +
    `Добавьте эту строку в .env файл:\n` +
    `TELEGRAM_USER_ID=${userId}\n\n` +
    `После этого перезапустите бота.`
  );

  // Продолжаем слушать новые сообщения
});

// Запуск бота
bot.launch();

console.log('✅ Бот запущен и ожидает сообщений...');
console.log('   Нажмите Ctrl+C для остановки\n');

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n\n👋 Остановка бота...');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
});
