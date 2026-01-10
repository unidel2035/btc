/**
 * Enhanced Sidebar Management System
 * Handles collapsible sidebar with animations, mobile overlay, backdrop, and swipe gestures
 */

class SidebarManager {
  constructor() {
    this.isOpen = false;
    this.isMobile = window.innerWidth < 768;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.isDragging = false;
    this.init();
  }

  /**
   * Initialize sidebar system
   */
  init() {
    // Setup toggle buttons
    this.setupToggleButtons();

    // Setup backdrop
    this.setupBackdrop();

    // Setup swipe gestures
    this.setupSwipeGestures();

    // Setup responsive behavior
    this.setupResponsive();

    // Setup navigation items
    this.setupNavItems();

    // Setup tooltips for collapsed state
    this.setupTooltips();

    // Apply initial state
    this.applyState();
  }

  /**
   * Apply sidebar state
   */
  applyState() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');

    if (!sidebar) return;

    if (this.isMobile) {
      // Mobile: use overlay mode
      if (this.isOpen) {
        sidebar.classList.add('open');
        sidebar.classList.remove('collapsed');
        if (backdrop) {
          backdrop.classList.add('active');
        }
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = 'hidden';
      } else {
        sidebar.classList.remove('open');
        if (backdrop) {
          backdrop.classList.remove('active');
        }
        // Restore body scroll
        document.body.style.overflow = '';
      }
    } else {
      // Desktop: normal behavior
      sidebar.classList.remove('open');
      if (backdrop) {
        backdrop.classList.remove('active');
      }
      document.body.style.overflow = '';
    }
  }

  /**
   * Toggle sidebar state
   */
  toggle() {
    if (this.isMobile) {
      this.isOpen = !this.isOpen;
    }
    this.applyState();
  }

  /**
   * Open sidebar
   */
  open() {
    if (this.isMobile) {
      this.isOpen = true;
      this.applyState();
    }
  }

  /**
   * Close sidebar
   */
  close() {
    if (this.isMobile) {
      this.isOpen = false;
      this.applyState();
    }
  }

  /**
   * Setup toggle buttons
   */
  setupToggleButtons() {
    // Get all toggle buttons (there might be multiple in header and sidebar)
    const toggleButtons = document.querySelectorAll('#sidebarToggle, .sidebar-toggle-btn');

    toggleButtons.forEach((btn) => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        });
      }
    });
  }

  /**
   * Setup backdrop
   */
  setupBackdrop() {
    let backdrop = document.querySelector('.sidebar-backdrop');

    // Create backdrop if it doesn't exist
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.id = 'sidebarBackdrop';
      document.body.appendChild(backdrop);
    }

    // Close sidebar when clicking backdrop
    backdrop.addEventListener('click', () => {
      this.close();
    });
  }

  /**
   * Setup swipe gestures for mobile
   */
  setupSwipeGestures() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Touch start
    document.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
      this.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    // Touch end
    document.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.touchEndY = e.changedTouches[0].screenY;
      this.handleSwipeGesture();
    }, { passive: true });

    // Also add swipe gesture on sidebar itself for closing
    sidebar.addEventListener('touchstart', (e) => {
      if (this.isMobile && this.isOpen) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
        this.isDragging = true;
      }
    }, { passive: true });

    sidebar.addEventListener('touchmove', (e) => {
      if (this.isMobile && this.isOpen && this.isDragging) {
        const currentX = e.changedTouches[0].screenX;
        const diff = currentX - this.touchStartX;

        // If swiping left, apply transform
        if (diff < 0) {
          const percent = Math.max(0, Math.min(1, Math.abs(diff) / 280));
          sidebar.style.transform = `translateX(${diff}px)`;
          sidebar.style.transition = 'none';
        }
      }
    }, { passive: true });

    sidebar.addEventListener('touchend', (e) => {
      if (this.isMobile && this.isOpen && this.isDragging) {
        this.touchEndX = e.changedTouches[0].screenX;
        const diff = this.touchEndX - this.touchStartX;

        sidebar.style.transition = '';
        sidebar.style.transform = '';

        // If swiped left more than 50px, close sidebar
        if (diff < -50) {
          this.close();
        }

        this.isDragging = false;
      }
    }, { passive: true });
  }

  /**
   * Handle swipe gesture
   */
  handleSwipeGesture() {
    if (!this.isMobile) return;

    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = Math.abs(this.touchEndY - this.touchStartY);
    const threshold = 50;

    // Ensure horizontal swipe (not vertical)
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      // Swipe from left edge to open
      if (deltaX > 0 && this.touchStartX < 50 && !this.isOpen) {
        this.open();
      }
      // Swipe left to close
      else if (deltaX < 0 && this.isOpen) {
        this.close();
      }
    }
  }

  /**
   * Setup navigation items to close sidebar on mobile
   */
  setupNavItems() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        if (this.isMobile) {
          // Close sidebar when nav item is clicked on mobile
          setTimeout(() => this.close(), 150);
        }
      });
    });
  }

  /**
   * Setup responsive behavior
   */
  setupResponsive() {
    // Use breakpoint manager if available
    if (window.breakpointManager) {
      window.breakpointManager.subscribe((breakpoints) => {
        const wasMobile = this.isMobile;
        this.isMobile = breakpoints.isMobile;

        // If switching from desktop to mobile, close sidebar
        if (this.isMobile && !wasMobile) {
          this.isOpen = false;
        }
        // If switching from mobile to desktop, ensure sidebar is properly displayed
        else if (!this.isMobile && wasMobile) {
          this.isOpen = false;
        }

        this.applyState();
      });
    } else {
      // Fallback to resize listener
      window.addEventListener('resize', () => {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth < 768;

        if (this.isMobile && !wasMobile) {
          this.isOpen = false;
        } else if (!this.isMobile && wasMobile) {
          this.isOpen = false;
        }

        this.applyState();
      });
    }

    // Set initial mobile state
    if (this.isMobile) {
      this.isOpen = false;
    }
  }

  /**
   * Setup tooltips for collapsed sidebar
   */
  setupTooltips() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item) => {
      const text = item.querySelector('.nav-label');
      if (text) {
        item.setAttribute('data-tooltip', text.textContent.trim());
      }
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    const backdrop = document.querySelector('.sidebar-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
    document.body.style.overflow = '';
  }
}

// Initialize sidebar manager after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sidebarManager = new SidebarManager();
  });
} else {
  window.sidebarManager = new SidebarManager();
}
