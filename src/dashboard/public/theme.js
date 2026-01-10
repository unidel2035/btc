/**
 * Theme Management Module
 * Handles dark/light theme switching with localStorage persistence
 */

(function() {
  'use strict';

  // Theme state
  let currentTheme = null;

  /**
   * Get system preference for color scheme
   * @returns {string} 'dark' or 'light'
   */
  function getSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Get saved theme from localStorage or system preference
   * @returns {string} 'dark' or 'light'
   */
  function getSavedTheme() {
    const saved = localStorage.getItem('theme');
    if (saved && (saved === 'dark' || saved === 'light')) {
      return saved;
    }
    // Default to light theme as specified in requirements
    return 'light';
  }

  /**
   * Apply theme to document
   * @param {string} theme - 'dark' or 'light'
   */
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update theme switcher button if it exists
    updateThemeSwitcherUI();

    // Update charts if they exist
    updateChartsTheme();

    // Dispatch custom event for other components to react
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  /**
   * Toggle between light and dark theme
   */
  function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
  }

  /**
   * Update theme switcher button UI
   */
  function updateThemeSwitcherUI() {
    const btn = document.getElementById('themeSwitcher');
    if (!btn) return;

    const icon = btn.querySelector('.theme-icon');
    if (icon) {
      icon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
    }

    const text = btn.querySelector('.theme-text');
    if (text) {
      text.textContent = currentTheme === 'light' ? 'Dark' : 'Light';
    }

    // Update aria-label for accessibility
    btn.setAttribute('aria-label',
      currentTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
    );
  }

  /**
   * Update Chart.js charts with new theme colors
   */
  function updateChartsTheme() {
    // Get computed CSS variables for current theme
    const root = document.documentElement;
    const styles = getComputedStyle(root);

    const colors = {
      primary: styles.getPropertyValue('--accent-primary').trim(),
      success: styles.getPropertyValue('--success').trim(),
      danger: styles.getPropertyValue('--danger').trim(),
      textPrimary: styles.getPropertyValue('--text-primary').trim(),
      textSecondary: styles.getPropertyValue('--text-secondary').trim(),
      border: styles.getPropertyValue('--border').trim(),
    };

    // Update equity chart if it exists
    if (window.equityChart) {
      updateEquityChartTheme(window.equityChart, colors);
    }

    // Update backtest equity chart if it exists
    if (typeof Chart !== 'undefined') {
      const backtestChart = Chart.getChart('backtestEquityChart');
      if (backtestChart) {
        updateEquityChartTheme(backtestChart, colors);
      }
    }

    // Update market depth chart if it exists
    if (window.marketDepthChart) {
      updateMarketDepthChartTheme(window.marketDepthChart, colors);
    }

    // Notify lightweight-charts about theme change
    if (window.tradingChart && window.tradingChart.applyOptions) {
      updateLightweightChartTheme(colors);
    }
  }

  /**
   * Update equity chart theme
   */
  function updateEquityChartTheme(chart, colors) {
    if (!chart || !chart.data || !chart.data.datasets) return;

    // Update dataset colors
    chart.data.datasets.forEach(dataset => {
      dataset.borderColor = colors.primary;
      dataset.backgroundColor = colors.primary.replace(')', ', 0.1)').replace('rgb', 'rgba');
    });

    // Update scale colors
    if (chart.options.scales) {
      if (chart.options.scales.y) {
        chart.options.scales.y.ticks.color = colors.textSecondary;
        chart.options.scales.y.grid.color = colors.border;
      }
      if (chart.options.scales.x) {
        chart.options.scales.x.ticks.color = colors.textSecondary;
        chart.options.scales.x.grid.color = colors.border;
      }
    }

    chart.update();
  }

  /**
   * Update market depth chart theme
   */
  function updateMarketDepthChartTheme(chart, colors) {
    if (!chart || !chart.data || !chart.data.datasets) return;

    // Update dataset colors
    if (chart.data.datasets[0]) { // Bids
      chart.data.datasets[0].borderColor = colors.success;
      chart.data.datasets[0].backgroundColor = colors.success.replace(')', ', 0.2)').replace('rgb', 'rgba');
    }
    if (chart.data.datasets[1]) { // Asks
      chart.data.datasets[1].borderColor = colors.danger;
      chart.data.datasets[1].backgroundColor = colors.danger.replace(')', ', 0.2)').replace('rgb', 'rgba');
    }

    // Update scale colors
    if (chart.options.scales) {
      ['x', 'y'].forEach(axis => {
        if (chart.options.scales[axis]) {
          chart.options.scales[axis].ticks.color = colors.textSecondary;
          chart.options.scales[axis].grid.color = colors.border;
        }
      });
    }

    chart.update();
  }

  /**
   * Update lightweight-charts theme
   */
  function updateLightweightChartTheme(colors) {
    const isDark = currentTheme === 'dark';

    const chartOptions = {
      layout: {
        background: { color: isDark ? '#23272F' : '#FFFFFF' },
        textColor: colors.textPrimary,
      },
      grid: {
        vertLines: { color: colors.border },
        horzLines: { color: colors.border },
      },
      crosshair: {
        mode: 0,
      },
    };

    if (window.tradingChart && window.tradingChart.applyOptions) {
      window.tradingChart.applyOptions(chartOptions);
    }

    // Update series colors if needed
    if (window.candlestickSeries) {
      window.candlestickSeries.applyOptions({
        upColor: colors.success,
        downColor: colors.danger,
        borderUpColor: colors.success,
        borderDownColor: colors.danger,
        wickUpColor: colors.success,
        wickDownColor: colors.danger,
      });
    }
  }

  /**
   * Listen for system theme changes
   */
  function listenForSystemThemeChanges() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Only follow system preference if user hasn't manually set a theme
      mediaQuery.addEventListener('change', (e) => {
        // Check if user has manually set a preference
        if (!localStorage.getItem('theme')) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Initialize theme system
   */
  function initTheme() {
    // Get initial theme
    const initialTheme = getSavedTheme();

    // Apply theme immediately (before DOM loads to prevent FOUC)
    applyTheme(initialTheme);

    // Listen for system theme changes
    listenForSystemThemeChanges();
  }

  /**
   * Setup theme switcher button
   */
  function setupThemeSwitcher() {
    const btn = document.getElementById('themeSwitcher');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
      updateThemeSwitcherUI();
    }
  }

  // Initialize immediately to prevent FOUC
  initTheme();

  // Setup UI after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupThemeSwitcher);
  } else {
    setupThemeSwitcher();
  }

  // Expose API globally
  window.themeManager = {
    toggle: toggleTheme,
    set: applyTheme,
    get: () => currentTheme,
    isDark: () => currentTheme === 'dark',
    isLight: () => currentTheme === 'light',
  };
})();
