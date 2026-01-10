# Modern UI Components Library

Библиотека переиспользуемых UI компонентов для BTC Trading Bot Dashboard с консистентной стилизацией, анимациями и поддержкой доступности.

## Обзор

Библиотека включает 10 современных компонентов:

1. **Card** - Карточки с вариантами стилей
2. **Button** - Кнопки с ripple эффектом
3. **Badge** - Бейджи для статусов
4. **Modal** - Модальные окна с анимацией
5. **Tooltip** - Подсказки
6. **Table** - Таблицы с сортировкой
7. **Skeleton** - Загрузочные плейсхолдеры
8. **Progress** - Прогресс-бары
9. **Input** - Поля ввода с валидацией
10. **Tabs** - Табы с плавными переходами

## Установка и Подключение

### В HTML

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Подключение стилей -->
  <link rel="stylesheet" href="/styles/animations.css">
  <link rel="stylesheet" href="/styles/components.css">
</head>
<body>
  <!-- Ваш контент -->

  <!-- Подключение компонентов -->
  <script type="module">
    import UIComponents from './components/ui/index.js';

    // Или отдельные компоненты
    import { Card, Button, Modal } from './components/ui/index.js';
  </script>
</body>
</html>
```

### Автоматическая инициализация

```javascript
import { initUIComponents } from './components/ui/index.js';

// Автоматически загружает CSS
initUIComponents();
```

## Использование Компонентов

### 1. Card Component

Гибкие карточки с различными вариантами оформления.

**Варианты:** `default`, `gradient`, `glass`, `outlined`

```javascript
import { Card } from './components/ui/index.js';

// Создание карточки
const card = new Card({
  variant: 'gradient',
  hoverable: true,
  title: 'Trading Statistics',
  subtitle: 'Real-time metrics'
});

const cardElement = card.render();
document.body.appendChild(cardElement);

// Установка контента
card.setContent('<p>Your content here</p>');

// Добавление футера
card.setFooter('<button>Action</button>');

// Изменение варианта
card.setVariant('glass');
```

**Быстрое создание:**

```javascript
import { createCard } from './components/ui/index.js';

const cardElement = createCard({
  variant: 'outlined',
  title: 'Position Details'
});
document.body.appendChild(cardElement);
```

---

### 2. Button Component

Кнопки с ripple эффектом, состояниями загрузки и иконками.

**Варианты:** `primary`, `success`, `danger`, `secondary`, `ghost`, `link`
**Размеры:** `sm`, `md`, `lg`

```javascript
import { Button } from './components/ui/index.js';

const button = new Button({
  variant: 'primary',
  size: 'md',
  text: 'Buy BTC',
  icon: '🚀',
  iconPosition: 'left',
  ripple: true,
  onClick: () => {
    console.log('Button clicked!');
  }
});

const buttonElement = button.render();
document.body.appendChild(buttonElement);

// Установка состояния загрузки
button.setLoading(true);

// Изменение текста
button.setText('Processing...');

// Отключение кнопки
button.setDisabled(true);

// Изменение варианта
button.setVariant('success');
```

**Быстрое создание:**

```javascript
import { createButton } from './components/ui/index.js';

const btn = createButton({
  variant: 'danger',
  text: 'Close Position',
  onClick: handleClose
});
```

---

### 3. Badge Component

Компактные бейджи для отображения статусов.

**Варианты:** `success`, `warning`, `danger`, `info`, `neutral`

```javascript
import { Badge } from './components/ui/index.js';

const badge = new Badge({
  variant: 'success',
  text: 'LONG',
  dot: true // Добавляет цветную точку
});

const badgeElement = badge.render();
document.body.appendChild(badgeElement);

// Изменение текста
badge.setText('SHORT');

// Изменение варианта
badge.setVariant('danger');
```

**Использование для статусов позиций:**

```javascript
const statusBadge = createBadge({
  variant: position.pnl > 0 ? 'success' : 'danger',
  text: position.pnl > 0 ? 'Profit' : 'Loss',
  dot: true
});
```

---

### 4. Modal Component

Модальные окна с backdrop blur и поддержкой клавиатуры.

**Размеры:** `sm`, `md`, `lg`, `xl`

```javascript
import { Modal } from './components/ui/index.js';

const modal = new Modal({
  size: 'md',
  title: 'Confirm Trade',
  closeOnBackdrop: true,
  closeOnEscape: true,
  onOpen: () => console.log('Modal opened'),
  onClose: () => console.log('Modal closed')
});

modal.render();

// Установка контента
modal.setContent(`
  <p>Are you sure you want to execute this trade?</p>
  <p><strong>Amount:</strong> 0.5 BTC</p>
`);

// Добавление футера с кнопками
const footer = document.createElement('div');
footer.style.display = 'flex';
footer.style.gap = '0.75rem';

const confirmBtn = createButton({
  variant: 'success',
  text: 'Confirm',
  onClick: () => {
    executeTrade();
    modal.close();
  }
});

const cancelBtn = createButton({
  variant: 'secondary',
  text: 'Cancel',
  onClick: () => modal.close()
});

footer.appendChild(cancelBtn);
footer.appendChild(confirmBtn);
modal.setFooter(footer);

// Открытие модального окна
modal.open();
```

**Быстрое создание:**

```javascript
const modal = createModal({
  title: 'Warning',
  size: 'sm'
});
modal.setContent('<p>Risk level is high!</p>');
modal.open();
```

---

### 5. Tooltip Component

Всплывающие подсказки при наведении.

**Позиции:** `top`, `bottom`, `left`, `right`

```javascript
import { Tooltip } from './components/ui/index.js';

const tooltip = new Tooltip({
  position: 'top',
  text: 'Current price: $50,000',
  delay: 200
});

// Присоединение к элементу
const button = document.createElement('button');
button.textContent = 'Hover me';

const container = tooltip.attach(button);
document.body.appendChild(container);

// Изменение текста
tooltip.setText('Updated price: $51,000');

// Изменение позиции
tooltip.setPosition('bottom');
```

**Использование с существующими элементами:**

```javascript
const priceElement = document.getElementById('btc-price');
const priceTooltip = createTooltip({
  position: 'right',
  text: '24h change: +5.2%'
});
priceTooltip.attach(priceElement);
```

---

### 6. Table Component

Таблицы с сортировкой и кастомными рендерерами.

```javascript
import { Table } from './components/ui/index.js';

const table = new Table({
  columns: [
    { key: 'symbol', label: 'Symbol', sortable: true },
    { key: 'side', label: 'Side', sortable: false, render: (value) => {
      return `<span class="ui-badge ui-badge-${value === 'LONG' ? 'success' : 'danger'}">${value}</span>`;
    }},
    { key: 'size', label: 'Size', sortable: true },
    { key: 'entryPrice', label: 'Entry Price', sortable: true },
    { key: 'pnl', label: 'PnL', sortable: true, render: (value) => {
      const color = value >= 0 ? 'var(--success)' : 'var(--danger)';
      return `<span style="color: ${color}">$${value.toFixed(2)}</span>`;
    }}
  ],
  data: [
    { symbol: 'BTC/USDT', side: 'LONG', size: 0.5, entryPrice: 50000, pnl: 250 },
    { symbol: 'ETH/USDT', side: 'SHORT', size: 5, entryPrice: 3000, pnl: -150 }
  ],
  striped: true,
  hoverable: true,
  onSort: (column, direction) => {
    console.log(`Sorted by ${column} ${direction}`);
  }
});

const tableElement = table.render();
document.body.appendChild(tableElement);

// Добавление новой строки
table.addRow({
  symbol: 'SOL/USDT',
  side: 'LONG',
  size: 10,
  entryPrice: 100,
  pnl: 50
});

// Обновление данных
table.setData(newData);
```

---

### 7. Skeleton Loader Component

Плейсхолдеры для загрузки контента.

**Типы:** `text`, `title`, `circle`, `rectangle`, `table`

```javascript
import { Skeleton } from './components/ui/index.js';

// Текстовый skeleton
const textSkeleton = new Skeleton({
  type: 'text',
  count: 3
});
document.body.appendChild(textSkeleton.render());

// Skeleton для аватара
const avatarSkeleton = createSkeleton({
  type: 'circle',
  width: 48,
  height: 48
});

// Skeleton для таблицы
const tableSkeleton = createSkeleton({
  type: 'table',
  count: 5 // количество строк
});

// После загрузки данных
setTimeout(() => {
  textSkeleton.destroy();
  // Показать реальный контент
}, 2000);
```

---

### 8. Progress Bar Component

Прогресс-бары с анимацией и процентами.

**Варианты:** `primary`, `success`, `warning`, `danger`, `info`
**Размеры:** `sm`, `md`, `lg`

```javascript
import { Progress } from './components/ui/index.js';

const progress = new Progress({
  value: 0,
  variant: 'success',
  size: 'md',
  showLabel: true,
  animated: true
});

const progressElement = progress.render();
document.body.appendChild(progressElement);

// Обновление значения
progress.setValue(50);

// Инкремент/декремент
progress.increment(10); // +10%
progress.decrement(5);  // -5%

// Изменение варианта
progress.setVariant('warning');

// Симуляция загрузки
let value = 0;
const interval = setInterval(() => {
  value += 10;
  progress.setValue(value);

  if (value >= 100) {
    clearInterval(interval);
    progress.setVariant('success');
  }
}, 500);
```

---

### 9. Input Component

Поля ввода с префиксами, суффиксами и валидацией.

```javascript
import { Input } from './components/ui/index.js';

const input = new Input({
  label: 'Amount',
  type: 'number',
  placeholder: '0.00',
  prefix: '$',
  suffix: 'USD',
  onChange: (value) => {
    console.log('Value changed:', value);
  },
  onFocus: () => console.log('Input focused'),
  onBlur: () => console.log('Input blurred')
});

const inputElement = input.render();
document.body.appendChild(inputElement);

// Получение значения
const value = input.getValue();

// Установка значения
input.setValue('100.50');

// Установка ошибки
input.setError('Amount must be greater than 0');

// Снятие ошибки
input.setError(null);

// Отключение
input.setDisabled(true);

// Фокус
input.focus();
```

**Пример с валидацией:**

```javascript
const amountInput = createInput({
  label: 'Trade Amount',
  type: 'number',
  prefix: '$',
  onChange: (value) => {
    const amount = parseFloat(value);
    if (amount <= 0) {
      amountInput.setError('Amount must be positive');
    } else if (amount > balance) {
      amountInput.setError('Insufficient balance');
    } else {
      amountInput.setError(null);
    }
  }
});
```

---

### 10. Tabs Component

Табы с плавными переходами между вкладками.

```javascript
import { Tabs } from './components/ui/index.js';

const tabs = new Tabs({
  tabs: [
    {
      id: 'overview',
      label: 'Overview',
      content: '<div>Overview content</div>'
    },
    {
      id: 'positions',
      label: 'Positions',
      content: '<div>Positions content</div>'
    },
    {
      id: 'history',
      label: 'History',
      content: '<div>History content</div>'
    }
  ],
  activeTab: 'overview',
  onChange: (newTabId, previousTabId) => {
    console.log(`Switched from ${previousTabId} to ${newTabId}`);
  }
});

const tabsElement = tabs.render();
document.body.appendChild(tabsElement);

// Переключение вкладки
tabs.setActiveTab('positions');

// Получение активной вкладки
const activeTab = tabs.getActiveTab();

// Добавление новой вкладки
tabs.addTab({
  id: 'settings',
  label: 'Settings',
  content: '<div>Settings content</div>'
});

// Удаление вкладки
tabs.removeTab('history');

// Обновление контента вкладки
tabs.updateTabContent('overview', '<div>Updated overview</div>');
```

---

## Глобальные Анимации

Библиотека включает готовые CSS анимации:

### Transition классы

```html
<div class="fade-enter-active">Fade in</div>
<div class="slide-up-enter-active">Slide up</div>
<div class="slide-down-enter-active">Slide down</div>
<div class="scale-enter-active">Scale in</div>
```

### Keyframe анимации

```css
/* Применение анимаций */
.my-element {
  animation: pulse 2s infinite;
  /* или */
  animation: bounce 0.6s ease-in-out;
  /* или */
  animation: shimmer 1.5s infinite;
}
```

Доступные анимации:
- `ripple` - ripple эффект
- `shimmer` - shimmer для skeleton
- `pulse` - пульсация
- `spin` - вращение
- `bounce` - подпрыгивание
- `shake` - тряска
- `glow` - свечение

### Utility классы

```html
<!-- Hover эффекты -->
<div class="hover-lift">Поднимается при наведении</div>
<div class="hover-scale">Увеличивается при наведении</div>
<div class="hover-glow">Светится при наведении</div>

<!-- Active эффект -->
<button class="active-press">Нажимается</button>

<!-- Focus эффекты -->
<input class="focus-ring">
```

---

## Темная Тема

Все компоненты поддерживают темную и светлую темы через CSS переменные:

```css
:root[data-theme='dark'] {
  --bg-primary: #1A1D23;
  --text-primary: #E9ECEF;
  --accent-primary: #4A9EFF;
  /* ... */
}

:root[data-theme='light'] {
  --bg-primary: #FFFFFF;
  --text-primary: #212529;
  --accent-primary: #0D6EFD;
  /* ... */
}
```

Переключение темы:

```javascript
// Установить темную тему
document.documentElement.setAttribute('data-theme', 'dark');

// Установить светлую тему
document.documentElement.setAttribute('data-theme', 'light');
```

---

## Доступность (Accessibility)

Все компоненты следуют лучшим практикам доступности:

- ✅ Поддержка клавиатурной навигации
- ✅ ARIA атрибуты
- ✅ Focus states
- ✅ Screen reader friendly
- ✅ Семантический HTML

### Клавиатурная навигация

- **Modal**: `Esc` - закрыть
- **Tabs**: `Arrow keys` - переключение между табами
- **Table**: `Click` на заголовки для сортировки
- **Buttons**: `Enter` или `Space` - активация

---

## Адаптивный Дизайн

Компоненты адаптируются под мобильные устройства:

- Модальные окна занимают всю доступную ширину на маленьких экранах
- Таблицы получают горизонтальную прокрутку
- Табы можно скроллить на мобильных

---

## Примеры Использования

### Создание карточки с позицией

```javascript
import { Card, Badge, Button } from './components/ui/index.js';

const positionCard = new Card({
  variant: 'default',
  hoverable: true
});

const card = positionCard.render();

const content = `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
    <div>
      <h4 style="margin: 0;">BTC/USDT</h4>
      <span style="color: var(--text-secondary);">Entry: $50,000</span>
    </div>
    <span class="ui-badge ui-badge-success">LONG</span>
  </div>
  <div style="margin-bottom: 1rem;">
    <div style="margin-bottom: 0.5rem;">Current: $51,000</div>
    <div style="color: var(--success); font-size: 1.25rem; font-weight: 600;">+$500 (+2%)</div>
  </div>
`;

positionCard.setContent(content);

const footer = document.createElement('div');
footer.style.display = 'flex';
footer.style.gap = '0.5rem';

const closeBtn = createButton({
  variant: 'danger',
  size: 'sm',
  text: 'Close Position'
});

footer.appendChild(closeBtn);
positionCard.setFooter(footer);

document.body.appendChild(card);
```

### Создание формы ввода с валидацией

```javascript
import { Input, Button, Modal } from './components/ui/index.js';

const modal = createModal({
  title: 'Open Position',
  size: 'md'
});

const form = document.createElement('div');

const symbolInput = new Input({
  label: 'Symbol',
  placeholder: 'BTC/USDT',
  value: 'BTC/USDT'
});

const amountInput = new Input({
  label: 'Amount',
  type: 'number',
  prefix: '$',
  placeholder: '0.00',
  onChange: (value) => {
    const amount = parseFloat(value);
    if (amount <= 0) {
      amountInput.setError('Amount must be positive');
    } else {
      amountInput.setError(null);
    }
  }
});

form.appendChild(symbolInput.render());
form.appendChild(amountInput.render());

modal.setContent(form);

const footer = document.createElement('div');
footer.style.display = 'flex';
footer.style.gap = '0.75rem';

footer.appendChild(createButton({
  variant: 'secondary',
  text: 'Cancel',
  onClick: () => modal.close()
}));

footer.appendChild(createButton({
  variant: 'success',
  text: 'Open Position',
  onClick: () => {
    const symbol = symbolInput.getValue();
    const amount = amountInput.getValue();

    if (!amount || parseFloat(amount) <= 0) {
      amountInput.setError('Invalid amount');
      return;
    }

    console.log('Opening position:', { symbol, amount });
    modal.close();
  }
}));

modal.setFooter(footer);
modal.open();
```

---

## TypeScript Support

Все компоненты имеют JSDoc комментарии для автодополнения в VS Code и других IDE.

Для полной поддержки TypeScript, создайте файл `types.d.ts`:

```typescript
declare module './components/ui/index.js' {
  export class Card {
    constructor(options: CardOptions);
    render(): HTMLElement;
    setContent(content: string | HTMLElement): this;
    setFooter(content: string | HTMLElement): this;
    setVariant(variant: CardVariant): this;
    destroy(): void;
  }

  export interface CardOptions {
    variant?: CardVariant;
    hoverable?: boolean;
    title?: string;
    subtitle?: string;
    className?: string;
  }

  export type CardVariant = 'default' | 'gradient' | 'glass' | 'outlined';

  // ... другие типы
}
```

---

## Производительность

### Оптимизации

- Минимальное количество DOM операций
- CSS-based анимации (GPU accelerated)
- Event delegation где возможно
- Lazy rendering для больших таблиц

### Best Practices

```javascript
// ✅ Хорошо - создать компонент один раз
const button = new Button({ text: 'Click me' });
const element = button.render();
document.body.appendChild(element);

// Обновлять состояние
button.setText('Updated');
button.setLoading(true);

// ❌ Плохо - пересоздавать компонент
button.destroy();
const newButton = new Button({ text: 'Updated' });
```

---

## Лицензия

MIT License - свободное использование в проекте BTC Trading Bot

---

## Поддержка

Для вопросов и предложений создавайте issue в репозитории проекта.
