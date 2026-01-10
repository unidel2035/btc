/**
 * Strategy Settings Manager
 * UI логика для настройки параметров стратегий
 */

class StrategySettingsManager {
  constructor() {
    this.currentStrategy = null;
    this.currentParams = {};
    this.paramSchema = [];
    this.originalParams = {};
    this.validationErrors = {};
    this.previewMode = false;
  }

  /**
   * Инициализация менеджера настроек
   */
  async initialize() {
    // Загружаем список стратегий
    await this.loadStrategies();

    // Привязываем обработчики событий
    this.bindEvents();
  }

  /**
   * Загрузить список стратегий
   */
  async loadStrategies() {
    try {
      const response = await fetch('/api/strategies/status');
      if (!response.ok) {
        console.warn('Strategies not available (demo mode)');
        return;
      }

      const strategies = await response.json();
      this.updateStrategySelector(strategies);
    } catch (error) {
      console.error('Failed to load strategies:', error);
    }
  }

  /**
   * Обновить селектор стратегий
   */
  updateStrategySelector(strategies) {
    const selector = document.getElementById('strategySelect');
    if (!selector) return;

    selector.innerHTML = '';
    strategies.forEach((strategy) => {
      const option = document.createElement('option');
      option.value = strategy.name;
      option.textContent = strategy.name + (strategy.enabled ? '' : ' (disabled)');
      selector.appendChild(option);
    });

    // Выбираем первую стратегию
    if (strategies.length > 0) {
      this.selectStrategy(strategies[0].name);
    }
  }

  /**
   * Выбрать стратегию для настройки
   */
  async selectStrategy(strategyName) {
    this.currentStrategy = strategyName;

    try {
      // Загружаем схему параметров
      const schemaResponse = await fetch(
        `/api/strategies/${encodeURIComponent(strategyName)}/schema`,
      );
      if (!schemaResponse.ok) {
        throw new Error('Failed to load strategy schema');
      }
      this.paramSchema = await schemaResponse.json();

      // Загружаем текущие параметры
      const paramsResponse = await fetch(`/api/strategies/${encodeURIComponent(strategyName)}`);
      if (!paramsResponse.ok) {
        throw new Error('Failed to load strategy params');
      }
      const strategyData = await paramsResponse.json();
      this.currentParams = strategyData.params || {};
      this.originalParams = { ...this.currentParams };

      // Отображаем форму
      this.renderParametersForm();

      // Загружаем пресеты
      await window.presetManager.loadPresets(strategyName);
      this.renderPresetsList();
    } catch (error) {
      console.error('Failed to select strategy:', error);
      this.showError('Failed to load strategy settings');
    }
  }

  /**
   * Отрисовать форму параметров
   */
  renderParametersForm() {
    const container = document.getElementById('strategySettingsContent');
    if (!container) return;

    // Группируем параметры
    const groups = this.groupParameters();

    container.innerHTML = '';

    Object.entries(groups).forEach(([groupName, params]) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'param-group-section';

      const groupTitle = document.createElement('h4');
      groupTitle.className = 'param-group-title';
      groupTitle.textContent = this.getGroupTitle(groupName);
      groupDiv.appendChild(groupTitle);

      const formDiv = document.createElement('form');
      formDiv.className = 'strategy-params-form';

      params.forEach((param) => {
        const paramDiv = this.renderParameter(param);
        formDiv.appendChild(paramDiv);
      });

      groupDiv.appendChild(formDiv);
      container.appendChild(groupDiv);
    });
  }

  /**
   * Группировать параметры по категориям
   */
  groupParameters() {
    const groups = {
      general: [],
      strategy: [],
      signal: [],
      risk: [],
      other: [],
    };

    this.paramSchema.forEach((param) => {
      const group = param.group || 'other';
      if (groups[group]) {
        groups[group].push(param);
      } else {
        groups.other.push(param);
      }
    });

    // Удаляем пустые группы
    Object.keys(groups).forEach((key) => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }

  /**
   * Получить название группы
   */
  getGroupTitle(groupName) {
    const titles = {
      general: 'Общие настройки',
      strategy: 'Параметры стратегии',
      signal: 'Параметры сигналов',
      risk: 'Управление рисками',
      other: 'Прочее',
    };
    return titles[groupName] || groupName;
  }

  /**
   * Отрисовать один параметр
   */
  renderParameter(param) {
    const paramDiv = document.createElement('div');
    paramDiv.className = 'param-group';
    paramDiv.dataset.paramName = param.name;

    const label = document.createElement('label');
    label.htmlFor = `param_${param.name}`;
    label.innerHTML = `
      ${param.description}
      <span class="param-info" title="${param.tooltip}">ℹ️</span>
    `;
    paramDiv.appendChild(label);

    const inputGroup = document.createElement('div');
    inputGroup.className = 'param-input-group';

    const currentValue =
      this.currentParams[param.name] !== undefined ? this.currentParams[param.name] : param.default;

    if (param.type === 'boolean') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `param_${param.name}`;
      checkbox.checked = currentValue;
      checkbox.addEventListener('change', () =>
        this.onParameterChange(param.name, checkbox.checked),
      );
      inputGroup.appendChild(checkbox);
    } else if (param.type === 'number') {
      // Range slider
      const range = document.createElement('input');
      range.type = 'range';
      range.id = `param_${param.name}_range`;
      range.min = param.min || 0;
      range.max = param.max || 100;
      range.step = param.step || 1;
      range.value = currentValue;

      // Number input
      const number = document.createElement('input');
      number.type = 'number';
      number.id = `param_${param.name}`;
      number.className = 'param-value';
      number.min = param.min;
      number.max = param.max;
      number.step = param.step;
      number.value = currentValue;

      // Синхронизация
      range.addEventListener('input', () => {
        number.value = range.value;
        this.onParameterChange(param.name, parseFloat(range.value));
      });

      number.addEventListener('input', () => {
        range.value = number.value;
        this.onParameterChange(param.name, parseFloat(number.value));
      });

      inputGroup.appendChild(range);
      inputGroup.appendChild(number);
    } else if (param.type === 'select') {
      const select = document.createElement('select');
      select.id = `param_${param.name}`;
      select.className = 'param-select';

      param.options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        option.selected = currentValue === opt.value;
        select.appendChild(option);
      });

      select.addEventListener('change', () => this.onParameterChange(param.name, select.value));
      inputGroup.appendChild(select);
    } else {
      // Text input
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `param_${param.name}`;
      input.className = 'param-value';
      input.value = currentValue;
      input.addEventListener('input', () => this.onParameterChange(param.name, input.value));
      inputGroup.appendChild(input);
    }

    paramDiv.appendChild(inputGroup);

    // Описание параметра
    const description = document.createElement('small');
    description.className = 'param-description';
    description.textContent = `Текущее: ${this.formatValue(currentValue, param)} | По умолчанию: ${this.formatValue(param.default, param)}`;
    if (param.min !== undefined && param.max !== undefined) {
      description.textContent += ` | Диапазон: ${param.min}-${param.max}`;
    }
    paramDiv.appendChild(description);

    // Ошибки валидации
    const errorDiv = document.createElement('div');
    errorDiv.className = 'param-error';
    errorDiv.id = `error_${param.name}`;
    errorDiv.style.display = 'none';
    paramDiv.appendChild(errorDiv);

    return paramDiv;
  }

  /**
   * Форматировать значение для отображения
   */
  formatValue(value, param) {
    if (param.type === 'number' && param.step && param.step < 1) {
      return typeof value === 'number' ? value.toFixed(4) : value;
    }
    if (param.type === 'number' && value !== undefined) {
      // Если значение очень маленькое, показываем в процентах
      if (value < 0.1 && value > 0) {
        return `${(value * 100).toFixed(2)}%`;
      }
    }
    return value;
  }

  /**
   * Обработчик изменения параметра
   */
  async onParameterChange(paramName, value) {
    this.currentParams[paramName] = value;

    // Валидация в реальном времени
    await this.validateParameter(paramName, value);

    // Подсветка измененных параметров
    this.highlightChangedParams();
  }

  /**
   * Валидация параметра
   */
  async validateParameter(paramName, value) {
    try {
      const response = await fetch(
        `/api/strategies/${encodeURIComponent(this.currentStrategy)}/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [paramName]: value }),
        },
      );

      const result = await response.json();

      if (!result.valid) {
        this.validationErrors[paramName] = result.errors[0] || 'Invalid value';
        this.showParameterError(paramName, this.validationErrors[paramName]);
      } else {
        delete this.validationErrors[paramName];
        this.hideParameterError(paramName);
      }

      return result.valid;
    } catch (error) {
      console.error('Validation failed:', error);
      return true; // Продолжаем при ошибке валидации
    }
  }

  /**
   * Показать ошибку параметра
   */
  showParameterError(paramName, message) {
    const errorDiv = document.getElementById(`error_${paramName}`);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }

    const paramDiv = document.querySelector(`[data-param-name="${paramName}"]`);
    if (paramDiv) {
      paramDiv.classList.add('param-error-state');
    }
  }

  /**
   * Скрыть ошибку параметра
   */
  hideParameterError(paramName) {
    const errorDiv = document.getElementById(`error_${paramName}`);
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }

    const paramDiv = document.querySelector(`[data-param-name="${paramName}"]`);
    if (paramDiv) {
      paramDiv.classList.remove('param-error-state');
    }
  }

  /**
   * Подсветка измененных параметров
   */
  highlightChangedParams() {
    Object.keys(this.currentParams).forEach((paramName) => {
      const paramDiv = document.querySelector(`[data-param-name="${paramName}"]`);
      if (!paramDiv) return;

      if (this.currentParams[paramName] !== this.originalParams[paramName]) {
        paramDiv.classList.add('param-changed');
      } else {
        paramDiv.classList.remove('param-changed');
      }
    });
  }

  /**
   * Применить изменения
   */
  async applySettings() {
    // Валидация всех параметров
    if (Object.keys(this.validationErrors).length > 0) {
      this.showError('Исправьте ошибки валидации перед применением');
      return;
    }

    try {
      const response = await fetch(
        `/api/strategies/${encodeURIComponent(this.currentStrategy)}/params`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.currentParams),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to apply settings');
      }

      this.originalParams = { ...this.currentParams };
      this.highlightChangedParams();
      this.showSuccess('Настройки успешно применены');
    } catch (error) {
      console.error('Failed to apply settings:', error);
      this.showError('Не удалось применить настройки');
    }
  }

  /**
   * Сбросить к значениям по умолчанию
   */
  resetToDefault() {
    if (!confirm('Сбросить все параметры к значениям по умолчанию?')) {
      return;
    }

    this.paramSchema.forEach((param) => {
      this.currentParams[param.name] = param.default;
    });

    this.renderParametersForm();
    this.highlightChangedParams();
  }

  /**
   * Предпросмотр изменений
   */
  async previewSettings() {
    this.previewMode = true;
    // TODO: Реализовать предпросмотр на графике
    this.showInfo('Предпросмотр пока не реализован');
  }

  /**
   * Отрисовать список пресетов
   */
  renderPresetsList() {
    const container = document.getElementById('presetsList');
    if (!container) return;

    const presets = window.presetManager.presets;

    if (presets.length === 0) {
      container.innerHTML = '<p class="text-muted">Нет сохраненных пресетов</p>';
      return;
    }

    container.innerHTML = '';

    presets.forEach((preset) => {
      const presetDiv = document.createElement('div');
      presetDiv.className = 'preset-item';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'preset-name';
      nameDiv.textContent = preset.name;

      if (preset.description) {
        const descDiv = document.createElement('div');
        descDiv.className = 'preset-description';
        descDiv.textContent = preset.description;
        presetDiv.appendChild(descDiv);
      }

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'preset-actions';

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Загрузить';
      loadBtn.className = 'btn btn-sm btn-secondary';
      loadBtn.onclick = () => this.loadPreset(preset.id);

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Экспорт';
      exportBtn.className = 'btn btn-sm btn-secondary';
      exportBtn.onclick = () => window.presetManager.exportPreset(preset.id);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Удалить';
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.onclick = () => this.deletePreset(preset.id);

      actionsDiv.appendChild(loadBtn);
      actionsDiv.appendChild(exportBtn);
      actionsDiv.appendChild(deleteBtn);

      presetDiv.appendChild(nameDiv);
      presetDiv.appendChild(actionsDiv);
      container.appendChild(presetDiv);
    });
  }

  /**
   * Загрузить пресет
   */
  async loadPreset(presetId) {
    try {
      await window.presetManager.applyPreset(this.currentStrategy, presetId);

      // Перезагружаем параметры
      await this.selectStrategy(this.currentStrategy);

      this.showSuccess('Пресет успешно загружен');
    } catch (error) {
      console.error('Failed to load preset:', error);
      this.showError('Не удалось загрузить пресет');
    }
  }

  /**
   * Сохранить текущие настройки как пресет
   */
  async saveAsPreset() {
    const name = prompt('Введите название пресета:');
    if (!name) return;

    const description = prompt('Введите описание (необязательно):');

    try {
      await window.presetManager.createPreset(
        name,
        this.currentStrategy,
        this.currentParams,
        description,
      );
      this.renderPresetsList();
      this.showSuccess('Пресет успешно сохранен');
    } catch (error) {
      console.error('Failed to save preset:', error);
      this.showError('Не удалось сохранить пресет');
    }
  }

  /**
   * Удалить пресет
   */
  async deletePreset(presetId) {
    if (!confirm('Удалить этот пресет?')) {
      return;
    }

    try {
      await window.presetManager.deletePreset(presetId);
      this.renderPresetsList();
      this.showSuccess('Пресет удален');
    } catch (error) {
      console.error('Failed to delete preset:', error);
      this.showError('Не удалось удалить пресет');
    }
  }

  /**
   * Экспорт конфигурации
   */
  exportConfiguration() {
    const config = {
      strategy: this.currentStrategy,
      params: this.currentParams,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `strategy-config-${this.currentStrategy.toLowerCase().replace(/\s+/g, '-')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Импорт конфигурации
   */
  async importConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config = JSON.parse(text);

        if (config.strategy && config.params) {
          this.currentParams = config.params;
          await this.selectStrategy(config.strategy);
          this.showSuccess('Конфигурация импортирована');
        } else {
          throw new Error('Invalid configuration format');
        }
      } catch (error) {
        console.error('Failed to import configuration:', error);
        this.showError('Не удалось импортировать конфигурацию');
      }
    };

    input.click();
  }

  /**
   * Привязка обработчиков событий
   */
  bindEvents() {
    // Селектор стратегии
    const strategySelect = document.getElementById('strategySelect');
    if (strategySelect) {
      strategySelect.addEventListener('change', () => this.selectStrategy(strategySelect.value));
    }

    // Кнопки действий
    const applyBtn = document.getElementById('applySettings');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applySettings());
    }

    const previewBtn = document.getElementById('previewSettings');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewSettings());
    }

    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetToDefault());
    }

    const savePresetBtn = document.getElementById('savePreset');
    if (savePresetBtn) {
      savePresetBtn.addEventListener('click', () => this.saveAsPreset());
    }

    const exportBtn = document.getElementById('exportConfig');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportConfiguration());
    }

    const importBtn = document.getElementById('importConfig');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importConfiguration());
    }
  }

  /**
   * Показать ошибку
   */
  showError(message) {
    // TODO: Улучшить отображение уведомлений
    alert('Ошибка: ' + message);
  }

  /**
   * Показать успех
   */
  showSuccess(message) {
    // TODO: Улучшить отображение уведомлений
    console.log('Success:', message);
    // Можно добавить toast notification
  }

  /**
   * Показать информацию
   */
  showInfo(message) {
    alert(message);
  }
}

// Глобальный экземпляр
window.strategySettingsManager = new StrategySettingsManager();

// Инициализация при загрузке страницы настроек
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('strategySettingsPanel')) {
    window.strategySettingsManager.initialize();
  }
});
