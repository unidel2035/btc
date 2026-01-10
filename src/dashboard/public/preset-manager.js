/**
 * Preset Manager
 * Управление пресетами настроек стратегий
 */

class PresetManager {
  constructor() {
    this.presets = [];
    this.currentStrategy = null;
  }

  /**
   * Загрузить пресеты для стратегии
   */
  async loadPresets(strategyName) {
    try {
      const response = await fetch(`/api/strategies/${encodeURIComponent(strategyName)}/presets`);
      if (!response.ok) {
        throw new Error('Failed to load presets');
      }
      this.presets = await response.json();
      this.currentStrategy = strategyName;
      return this.presets;
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [];
    }
  }

  /**
   * Загрузить все пресеты
   */
  async loadAllPresets() {
    try {
      const response = await fetch('/api/strategies/presets');
      if (!response.ok) {
        throw new Error('Failed to load all presets');
      }
      this.presets = await response.json();
      return this.presets;
    } catch (error) {
      console.error('Failed to load all presets:', error);
      return [];
    }
  }

  /**
   * Создать новый пресет
   */
  async createPreset(name, strategyName, params, description = '') {
    try {
      const response = await fetch('/api/strategies/presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          strategy: strategyName,
          params,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create preset');
      }

      const preset = await response.json();
      this.presets.push(preset);
      return preset;
    } catch (error) {
      console.error('Failed to create preset:', error);
      throw error;
    }
  }

  /**
   * Удалить пресет
   */
  async deletePreset(presetId) {
    try {
      const response = await fetch(`/api/strategies/presets/${presetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete preset');
      }

      this.presets = this.presets.filter(p => p.id !== presetId);
      return true;
    } catch (error) {
      console.error('Failed to delete preset:', error);
      throw error;
    }
  }

  /**
   * Применить пресет к стратегии
   */
  async applyPreset(strategyName, presetId) {
    try {
      const response = await fetch(`/api/strategies/${encodeURIComponent(strategyName)}/apply-preset/${presetId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to apply preset');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to apply preset:', error);
      throw error;
    }
  }

  /**
   * Получить пресет по ID
   */
  getPreset(presetId) {
    return this.presets.find(p => p.id === presetId);
  }

  /**
   * Экспортировать пресет в JSON
   */
  exportPreset(presetId) {
    const preset = this.getPreset(presetId);
    if (!preset) {
      throw new Error('Preset not found');
    }

    const dataStr = JSON.stringify(preset, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Импортировать пресет из JSON
   */
  async importPreset(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const preset = JSON.parse(e.target.result);

          // Валидация структуры
          if (!preset.name || !preset.strategy || !preset.params) {
            throw new Error('Invalid preset format');
          }

          // Создаем новый пресет на основе импортированных данных
          const newPreset = await this.createPreset(
            preset.name + ' (imported)',
            preset.strategy,
            preset.params,
            preset.description || ''
          );

          resolve(newPreset);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Сохранить пресет в localStorage (резервное хранилище)
   */
  saveToLocalStorage(preset) {
    try {
      const localPresets = this.getLocalPresets();
      localPresets.push(preset);
      localStorage.setItem('strategy_presets', JSON.stringify(localPresets));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  /**
   * Получить пресеты из localStorage
   */
  getLocalPresets() {
    try {
      const presetsJson = localStorage.getItem('strategy_presets');
      return presetsJson ? JSON.parse(presetsJson) : [];
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return [];
    }
  }

  /**
   * Синхронизировать с localStorage
   */
  syncWithLocalStorage() {
    const localPresets = this.getLocalPresets();
    // Объединяем с текущими пресетами, избегая дубликатов
    const mergedPresets = [...this.presets];

    localPresets.forEach(localPreset => {
      if (!mergedPresets.find(p => p.id === localPreset.id)) {
        mergedPresets.push(localPreset);
      }
    });

    this.presets = mergedPresets;
    return mergedPresets;
  }
}

// Глобальный экземпляр
window.presetManager = new PresetManager();
