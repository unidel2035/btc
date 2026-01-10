# Telegram Bot Commands Reference

Полный справочник команд Telegram Bot для управления торговым ботом.

## 📋 Содержание

- [Основные команды](#основные-команды)
- [Информационные команды](#информационные-команды)
- [Управление торговлей](#управление-торговлей)
- [Настройки](#настройки)
- [Inline Keyboard](#inline-keyboard)

## 🚀 Основные команды

### `/start`

Запуск бота и отображение главного меню.

**Пример:**
```
User: /start
Bot: 🤖 BTC TRADING BOT
     Welcome to your trading bot control center!

     [Dashboard] [Balance]
     [Positions] [P&L]
     [Signals]   [Screening]
     [Start]     [Pause]
     [Settings]  [Help]
```

### `/help`

Показать список всех доступных команд.

**Пример:**
```
User: /help
Bot: 📚 AVAILABLE COMMANDS

     📊 Information
     /status - Current bot status
     /balance - Balance overview
     /positions - Open positions list
     ...
```

## 📊 Информационные команды

### `/status`

Показать текущий статус бота и производительность.

**Формат:** `/status`

**Пример:**
```
User: /status
Bot: 🤖 BOT STATUS

     Status: 🟢 ACTIVE
     Uptime: 2d 5h
     Open Positions: 3

     Performance
     Daily P&L: 🟢 +234.56 USDT
     Weekly P&L: 🟢 +1,123.45 USDT
     Total P&L: 🟢 +5,678.90 USDT

     Win Rate: +65.00%
     Total Trades: 150

     [🔄 Refresh] [« Back]
```

### `/balance`

Показать баланс аккаунта и активы.

**Формат:** `/balance`

**Пример:**
```
User: /balance
Bot: 💰 BALANCE

     Total: 10,450.23 USDT
     Available: 8,120.45 USDT
     In Positions: 2,329.78 USDT

     Performance
     Daily P&L: 🟢 +234.56 USDT (+2.30%)
     Weekly P&L: 🟢 +1,123.45 USDT (+12.00%)

     Assets
     • USDT: 8,120.45 (8,120.45 USDT)
     • BTC: 0.05 (2,500.00 USDT)
     • ETH: 1.2 (3,600.00 USDT)

     [🔄 Refresh] [« Back]
```

### `/positions`

Показать все открытые позиции.

**Формат:** `/positions`

**Пример:**
```
User: /positions
Bot: 📊 POSITIONS (3)

     📈 BTC/USDT LONG
       52,000.00 USDT | 🟢 +4.00%

     📈 ETH/USDT LONG
       3,100.00 USDT | 🟢 +3.33%

     📉 RNDR/USDT SHORT
       2.40 USDT | 🔴 -2.00%

     Summary
     Total Value: 8,329.78 USDT
     Total P&L: 🟢 +178.45 USDT
     Avg P&L: +2.14%

     [🔄 Refresh] [« Back]
```

### `/pnl`

Показать отчет о прибыли и убытках.

**Формат:** `/pnl`

**Пример:**
```
User: /pnl
Bot: 📈 PROFIT & LOSS

     Today
     🟢 +234.56 USDT

     This Week
     🟢 +1,123.45 USDT

     This Month
     🟢 +3,456.78 USDT

     Total
     🟢 +5,678.90 USDT

     Statistics
     Win Rate: +65.00%
     Total Trades: 150

     [🔄 Refresh] [« Back]
```

### `/signals`

Показать последние торговые сигналы.

**Формат:** `/signals`

**Пример:**
```
User: /signals
Bot: 📈 SIGNAL: BTC/USDT

     Direction: LONG
     Confidence: ⭐⭐⭐⭐⭐ (+85.00%)
     Score: 8.5

     Reasons
     • Strong bullish momentum
     • Positive news sentiment
     • Volume spike detected

     Sources: TechnicalAnalysis, NewsSentiment
     Time: Jan 10, 18:30 UTC
```

### `/screening`

Запустить и показать результаты скрининга проектов.

**Формат:** `/screening`

**Пример:**
```
User: /screening
Bot: 🔍 Running screening analysis... This may take a moment.

Bot: 🔍 SCREENING RESULTS

     Analyzed: 500 projects
     Qualified: 25 projects
     Time: Jan 10, 18:35 UTC

     Top Picks
     1. RNDR - Score: 8.7 (AI/Computing)
     2. TAO - Score: 8.5 (AI/Computing)
     3. FET - Score: 8.3 (AI/Computing)
     4. LINK - Score: 8.2 (DeFi Infrastructure)
     5. AAVE - Score: 8.0 (DeFi Lending)

     Top Sectors
     • AI/Computing: 8.8 (8 projects)
     • DeFi Infrastructure: 8.5 (6 projects)
     • Layer 1: 8.3 (5 projects)

     [🔄 Run Again] [« Back]
```

## 🎮 Управление торговлей

### `/start_trading`

Запустить автоматическую торговлю.

**Формат:** `/start_trading`

**Требует:** PIN-код

**Пример:**
```
User: /start_trading
Bot: ⚠️ CONFIRMATION REQUIRED

     Action: Start Trading
     This will enable automated trading.

     Enter your PIN to confirm:

User: 1234
Bot: ✅ Automated trading started successfully!
```

### `/stop_trading`

Остановить автоматическую торговлю (аварийная остановка).

**Формат:** `/stop_trading`

**Требует:** PIN-код

**Пример:**
```
User: /stop_trading
Bot: ⚠️ CONFIRMATION REQUIRED

     Action: Stop Trading
     This will stop automated trading.
     Open positions will remain open.

     Enter your PIN to confirm:

User: 1234
Bot: ✅ Automated trading stopped!
```

### `/close_position`

Закрыть конкретную позицию по символу.

**Формат:** `/close_position <symbol>`

**Требует:** PIN-код

**Примеры:**
```
# Close BTC position
User: /close_position BTC/USDT
Bot: ⚠️ CONFIRMATION REQUIRED

     Action: Close Position: BTC/USDT
     Current P&L: +200.00 USDT

     Enter your PIN to confirm:

User: 1234
Bot: ✅ Position BTC/USDT closed successfully!

# Invalid usage
User: /close_position
Bot: ❌ Usage: /close_position <symbol>
     Example: /close_position BTC/USDT

# Position not found
User: /close_position XYZ/USDT
Bot: ❌ No open position found for XYZ/USDT
```

## ⚙️ Настройки

### `/settings`

Управление настройками уведомлений.

**Формат:** `/settings`

**Пример:**
```
User: /settings
Bot: ⚙️ NOTIFICATION SETTINGS

     🔔 Trade Alerts
     ✅ Position opened
     ✅ Position closed
     ✅ Stop Loss hit
     ✅ Take Profit hit
     ❌ Trailing stop updated

     ⚠️ System Alerts
     ✅ Critical errors
     ✅ Daily drawdown limit
     ✅ Position loss > 5%
     ❌ API rate limits

     📊 Reports
     ✅ Daily summary (09:00 UTC)
     ✅ Weekly summary
     ❌ Monthly report

     🔕 Quiet Hours: 23:00 - 07:00 UTC

     [Trade Alerts] [System Alerts]
     [Reports]      [Quiet Hours]
     [« Back]
```

## 🎛️ Inline Keyboard

Бот использует интерактивные кнопки для удобной навигации:

### Главное меню

```
┌─────────────────────────────────┐
│ [📊 Dashboard] [💰 Balance]     │
│ [📈 Positions] [📉 P&L]         │
│ [🔔 Signals]   [🔍 Screening]   │
│ [▶️ Start]     [⏸️ Pause]        │
│ [⚙️ Settings]  [❓ Help]        │
└─────────────────────────────────┘
```

### Кнопки действий

- **🔄 Refresh** - Обновить данные
- **« Back** - Вернуться в главное меню
- **▶️ Start** - Запустить торговлю
- **⏸️ Pause** - Остановить торговлю
- **❌ Close** - Закрыть позицию

### Настройки уведомлений

Используйте кнопки для переключения настроек:

```
┌─────────────────────────────────┐
│ ✅ Position Opened              │
│ ✅ Position Closed              │
│ ❌ Trailing Stop Updated        │
│ [« Back]                        │
└─────────────────────────────────┘
```

## 📬 Автоматические уведомления

Бот отправляет уведомления автоматически при событиях:

### Позиция открыта

```
🟢 POSITION OPENED

📈 LONG BTC/USDT

Entry: 50,000.00 USDT
Size: 0.1000
Value: 5,000.00 USDT

Stop Loss: 48,000.00 USDT
Take Profit: 55,000.00 USDT
```

### Позиция закрыта

```
🔴 POSITION CLOSED

📈 LONG BTC/USDT

Entry: 50,000.00 USDT
Exit: 52,000.00 USDT

🟢 P&L: +200.00 USDT (+4.00%)

Duration: 1h 30m
```

### Критическая ошибка

```
🚨 CRITICAL ERROR

Exchange connection lost

Attempting to reconnect...
```

### Ежедневный отчет

```
📊 DAILY SUMMARY

Date: Jan 10, 2026

Trades: 5
Win Rate: 80%
P&L: +234.56 USDT (+2.35%)

Top Performer: BTC/USDT (+150.00 USDT)
```

## 🛡️ Безопасность

### Whitelist

Только пользователи из whitelist могут использовать бота.

**Неавторизованный доступ:**
```
User (not in whitelist): /start
Bot: ❌ Access denied. You are not authorized to use this bot.
```

### Rate Limiting

Защита от спама команд:

```
User: /status
User: /balance
... (10 commands in 60 seconds)
User: /positions
Bot: ⚠️ Rate limit exceeded. Please wait 45 seconds before sending more commands.
```

### PIN-код

Критические операции требуют подтверждения:

- `/start_trading` - Запуск торговли
- `/stop_trading` - Остановка торговли
- `/close_position` - Закрытие позиции

**Неверный PIN:**
```
User: 0000
Bot: ❌ Invalid PIN. Action cancelled.
```

## 📝 Примечания

1. **Время ответа:** Большинство команд отвечают < 2 секунд
2. **Screening:** Может занять до 30 секунд в зависимости от размера анализа
3. **Уведомления:** Настраиваются индивидуально для каждого пользователя
4. **Quiet Hours:** Уведомления не отправляются в тихие часы (опционально)
5. **PIN Expiry:** PIN-запросы истекают через 5 минут

## ❓ Часто задаваемые вопросы

**Q: Как узнать свой User ID?**
A: Отправьте сообщение [@userinfobot](https://t.me/userinfobot)

**Q: Можно ли добавить несколько пользователей?**
A: Да, добавьте их User IDs в whitelist конфигурации

**Q: Что делать, если забыл PIN?**
A: Обновите `TELEGRAM_PIN_CODE` в `.env` и перезапустите бота

**Q: Как отключить определенные уведомления?**
A: Используйте `/settings` для управления уведомлениями

**Q: Работает ли бот offline?**
A: Нет, требуется постоянное подключение к Telegram API

## 🔗 Связанные документы

- [Настройка бота](./telegram-bot.md)
- [API Reference](./api/telegram.md)
- [Примеры](../examples/telegram-bot-example.ts)
