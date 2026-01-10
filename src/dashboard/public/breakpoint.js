/**
 * Breakpoint Detection Utility (JavaScript)
 * Provides reactive breakpoint detection and responsive helpers
 */

/**
 * Breakpoint definitions matching CSS media queries
 */
const BREAKPOINTS = {
  mobile: 767,
  tablet: 768,
  tabletMax: 1023,
  desktop: 1024,
  largeDesktop: 1440,
};

/**
 * BreakpointManager class
 * Manages breakpoint detection and change events
 */
class BreakpointManager {
  constructor() {
    this.callbacks = new Set();
    this.breakpoints = this.calculateBreakpoints();
    this.resizeTimeout = null;
    this.mediaQueries = new Map();
    this.init();
  }

  /**
   * Initialize the breakpoint manager
   */
  init() {
    // Setup resize listener with debouncing
    window.addEventListener('resize', this.handleResize.bind(this));

    // Setup media query listeners
    this.setupMediaQueries();

    // Initial calculation
    this.updateBreakpoints();
  }

  /**
   * Setup media query listeners
   */
  setupMediaQueries() {
    const queries = {
      mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
      tablet: `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.tabletMax}px)`,
      desktop: `(min-width: ${BREAKPOINTS.desktop}px) and (max-width: ${BREAKPOINTS.largeDesktop - 1}px)`,
      largeDesktop: `(min-width: ${BREAKPOINTS.largeDesktop}px)`,
    };

    Object.entries(queries).forEach(([name, query]) => {
      const mq = window.matchMedia(query);
      this.mediaQueries.set(name, mq);

      // Add change listener
      mq.addEventListener('change', () => this.updateBreakpoints());
    });
  }

  /**
   * Handle window resize with debouncing
   */
  handleResize() {
    if (this.resizeTimeout !== null) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.updateBreakpoints();
      this.resizeTimeout = null;
    }, 150);
  }

  /**
   * Calculate current breakpoints
   */
  calculateBreakpoints() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const isMobile = width <= BREAKPOINTS.mobile;
    const isTablet = width >= BREAKPOINTS.tablet && width <= BREAKPOINTS.tabletMax;
    const isDesktop = width >= BREAKPOINTS.desktop && width < BREAKPOINTS.largeDesktop;
    const isLargeDesktop = width >= BREAKPOINTS.largeDesktop;

    let currentBreakpoint = 'desktop';
    if (isMobile) currentBreakpoint = 'mobile';
    else if (isTablet) currentBreakpoint = 'tablet';
    else if (isDesktop) currentBreakpoint = 'desktop';
    else if (isLargeDesktop) currentBreakpoint = 'large-desktop';

    return {
      isMobile,
      isTablet,
      isDesktop,
      isLargeDesktop,
      currentBreakpoint,
      width,
      height,
    };
  }

  /**
   * Update breakpoints and notify callbacks
   */
  updateBreakpoints() {
    const oldBreakpoints = { ...this.breakpoints };
    this.breakpoints = this.calculateBreakpoints();

    // Only notify if breakpoint actually changed
    if (oldBreakpoints.currentBreakpoint !== this.breakpoints.currentBreakpoint) {
      this.notify();
    }
  }

  /**
   * Notify all registered callbacks
   */
  notify() {
    this.callbacks.forEach((callback) => {
      try {
        callback(this.breakpoints);
      } catch (error) {
        console.error('Error in breakpoint callback:', error);
      }
    });
  }

  /**
   * Subscribe to breakpoint changes
   */
  subscribe(callback) {
    this.callbacks.add(callback);

    // Call immediately with current state
    callback(this.breakpoints);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Get current breakpoints
   */
  get current() {
    return { ...this.breakpoints };
  }

  /**
   * Check if current breakpoint matches
   */
  is(breakpoint) {
    return this.breakpoints.currentBreakpoint === breakpoint;
  }

  /**
   * Check if viewport is at least a certain breakpoint
   */
  isAtLeast(breakpoint) {
    const order = ['mobile', 'tablet', 'desktop', 'large-desktop'];
    const currentIndex = order.indexOf(this.breakpoints.currentBreakpoint);
    const targetIndex = order.indexOf(breakpoint);
    return currentIndex >= targetIndex;
  }

  /**
   * Check if viewport is at most a certain breakpoint
   */
  isAtMost(breakpoint) {
    const order = ['mobile', 'tablet', 'desktop', 'large-desktop'];
    const currentIndex = order.indexOf(this.breakpoints.currentBreakpoint);
    const targetIndex = order.indexOf(breakpoint);
    return currentIndex <= targetIndex;
  }

  /**
   * Check if device is touch-enabled
   */
  get isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Get optimal column count for grids based on breakpoint
   */
  getGridColumns(options = {}) {
    const defaults = {
      mobile: 1,
      tablet: 2,
      desktop: 3,
      largeDesktop: 4,
    };

    const config = { ...defaults, ...options };

    if (this.breakpoints.isMobile) return config.mobile;
    if (this.breakpoints.isTablet) return config.tablet;
    if (this.breakpoints.isDesktop) return config.desktop;
    return config.largeDesktop;
  }

  /**
   * Cleanup
   */
  destroy() {
    window.removeEventListener('resize', this.handleResize.bind(this));
    if (this.resizeTimeout !== null) {
      clearTimeout(this.resizeTimeout);
    }
    this.callbacks.clear();
    this.mediaQueries.clear();
  }
}

// Create singleton instance
const breakpointManager = new BreakpointManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = breakpointManager;
}

// Add to window for global access
window.breakpointManager = breakpointManager;
