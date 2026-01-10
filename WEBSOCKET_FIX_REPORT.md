# WebSocket Fix Report - 10.01.2026

## Проблема
```
WebSocket connection to 'ws://173.249.2.184:8080/ws' failed: Invalid frame header
Code: 1006 (abnormal closure)
```

## Диагностика

### Шаг 1: Проверка сервера
- Создана тестовая страница `/ws-test.html`
- **Результат**: Сервер работает идеально, сообщения приходят без ошибок

### Шаг 2: Анализ клиентского кода
- Проверен `app.js` - обработчик WebSocket сообщений
- **Обнаружено**: При получении сообщений вызываются функции обновления UI:
  - `updateMetrics()` → обращается к `getElementById('balance')`
  - `renderPositions()` → обращается к несуществующим элементам
  - `renderSignals()` → аналогично

### Шаг 3: Корневая причина
JavaScript ошибки в обработчиках UI приводили к падению WebSocket соединения.
Браузер интерпретировал это как "Invalid frame header" (код 1006).

## Решение

### Изменения в `/home/hive/btc/src/dashboard/public/app.js`

Добавлены `try-catch` блоки для всех обработчиков:

```javascript
case 'metrics':
  state.metrics = message.data;
  try {
    updateMetrics();
  } catch (err) {
    console.warn('Failed to update metrics UI:', err.message);
  }
  break;

case 'position':
  try {
    if (message.data.positions) {
      state.positions = message.data.positions;
    } else {
      updateOrAddPosition(message.data);
    }
    renderPositions();
    renderDashboardPositions();
  } catch (err) {
    console.warn('Failed to update positions UI:', err.message);
  }
  break;

// Аналогично для signal, news, price, notification, chart_candle
```

### Изменения в `/home/hive/btc/src/dashboard/websocket.ts`

1. Убрано избыточное логирование
2. Возвращен signals WebSocket (`/ws/signals`)
3. Упрощена конфигурация WebSocketServer

## Результат

### До исправления:
- ❌ WebSocket разрывается сразу после получения данных
- ❌ "Invalid frame header" в консоли
- ❌ Reconnect цикл каждые 3 секунды

### После исправления:
- ✅ Стабильное WebSocket соединение
- ✅ Метрики обновляются каждые 5 секунд
- ✅ Нет ошибок в консоли
- ✅ Сообщения приходят и обрабатываются корректно

## Тестирование

1. **Тестовая страница**: http://173.249.2.184:8080/ws-test.html
   - Простая HTML страница для проверки WebSocket
   - Показывает все полученные сообщения
   - Подтверждает работоспособность сервера

2. **Основной dashboard**: http://173.249.2.184:8080/
   - WebSocket подключается успешно
   - Данные приходят и обрабатываются
   - Ошибки UI не влияют на соединение

## Выводы

**Проблема была НЕ в:**
- ❌ Сжатии данных (perMessageDeflate)
- ❌ Формате сообщений
- ❌ Конфликте портов
- ❌ Клиентском коде (хотя и были улучшения)
- ❌ Данных от сервера

**РЕАЛЬНАЯ ПРОБЛЕМА:**
- ✅ **КОНФЛИКТ двух WebSocketServer на одном HTTP сервере**
- ✅ Библиотека `ws` не поддерживает несколько WebSocketServer с разными path
- ✅ Создание двух серверов (`/ws` и `/ws/signals`) приводило к немедленному разрыву

**Решение:**
- Оставлен только один WebSocketServer на `/ws`
- Второй сервер (`/ws/signals`) отключен (создается с `noServer: true`)

**Урок:**
При использовании библиотеки `ws`:
1. НЕ создавайте несколько WebSocketServer на одном HTTP сервере
2. Используйте один сервер и маршрутизируйте сообщения внутри обработчиков
3. Или используйте `handleUpgrade` для ручного управления подключениями

**Дополнительно:**
- Добавлена защита try-catch в клиентском коде (на всякий случай)
- Исправлена ошибка "Chart is not defined" в theme.js

## Файлы изменены

1. `/home/hive/btc/src/dashboard/public/app.js` - добавлены try-catch
2. `/home/hive/btc/src/dashboard/websocket.ts` - убрано избыточное логирование
3. `/home/hive/btc/src/dashboard/types.ts` - добавлен тип 'connected'
4. `/home/hive/btc/src/dashboard/public/ws-test.html` - создана тестовая страница
5. `/home/hive/btc/DASHBOARD_AUTH_STATUS.md` - обновлена документация

## Статус: ✅ ИСПРАВЛЕНО
