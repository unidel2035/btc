/**
 * Sidebar Management System
 * Handles collapsible sidebar with animations and state persistence
 */

class SidebarManager {
  constructor() {
    this.isCollapsed = this.getInitialState();
    this.isMobile = window.innerWidth < 768;
    this.init();
  }

  /**
   * Get initial sidebar state from localStorage
   */
  getInitialState() {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  }

  /**
   * Initialize sidebar system
   */
  init() {
    // Apply initial state
    this.applyState();

    // Setup toggle button
    this.setupToggleButton();

    // Setup responsive behavior
    this.setupResponsive();

    // Setup tooltips for collapsed state
    this.setupTooltips();
  }

  /**
   * Apply sidebar state
   */
  applyState() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (!sidebar) return;

    if (this.isCollapsed) {
      sidebar.classList.add('collapsed');
      if (mainContent) mainContent.classList.add('sidebar-collapsed');
    } else {
      sidebar.classList.remove('collapsed');
      if (mainContent) mainContent.classList.remove('sidebar-collapsed');
    }
  }

  /**
   * Toggle sidebar state
   */
  toggle() {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('sidebarCollapsed', this.isCollapsed);
    this.applyState();

    // Animate the change
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.transition = 'width 0.3s ease';
    }
  }

  /**
   * Setup toggle button
   */
  setupToggleButton() {
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  /**
   * Setup responsive behavior
   */
  setupResponsive() {
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;

      // Auto-collapse on mobile
      if (this.isMobile && !wasMobile) {
        this.isCollapsed = true;
        this.applyState();
      }
    });

    // Auto-collapse on initial load if mobile
    if (this.isMobile) {
      this.isCollapsed = true;
      this.applyState();
    }
  }

  /**
   * Setup tooltips for collapsed sidebar
   */
  setupTooltips() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item) => {
      const text = item.querySelector('span:not(.icon):not(.badge)');
      if (text) {
        item.setAttribute('data-tooltip', text.textContent.trim());
      }
    });
  }

  /**
   * Open sidebar (for mobile overlay)
   */
  open() {
    this.isCollapsed = false;
    this.applyState();
  }

  /**
   * Close sidebar (for mobile overlay)
   */
  close() {
    this.isCollapsed = true;
    this.applyState();
  }
}

// Initialize sidebar manager
const sidebarManager = new SidebarManager();

// Export for use in other modules
window.sidebarManager = sidebarManager;
