/**
 * Theme System - Dark/Light Mode Management
 * Handles theme switching, localStorage persistence, and system preference detection
 */

class ThemeManager {
  constructor() {
    this.currentTheme = this.getInitialTheme();
    this.init();
  }

  /**
   * Get initial theme from localStorage or system preference
   */
  getInitialTheme() {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'dark'; // Default to dark theme
  }

  /**
   * Initialize theme system
   */
  init() {
    // Apply initial theme
    this.applyTheme(this.currentTheme);

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          // Only auto-switch if user hasn't set a preference
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }

    // Setup theme toggle button
    this.setupToggleButton();
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;

    // Update toggle button icon
    this.updateToggleIcon();
  }

  /**
   * Set theme and save to localStorage
   */
  setTheme(theme) {
    this.applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Trigger custom event for other components
    window.dispatchEvent(
      new CustomEvent('themeChange', {
        detail: { theme },
      })
    );
  }

  /**
   * Toggle between dark and light themes
   */
  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Setup theme toggle button
   */
  setupToggleButton() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  /**
   * Update toggle button icon
   */
  updateToggleIcon() {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      const icon = this.currentTheme === 'dark' ? '☀️' : '🌙';
      toggleBtn.innerHTML = icon;
      toggleBtn.title = this.currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other modules
window.themeManager = themeManager;
