/**
 * Breakpoint Detection Utility
 * Provides reactive breakpoint detection and responsive helpers
 */

export interface Breakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop' | 'large-desktop';
  width: number;
  height: number;
}

export type BreakpointCallback = (breakpoints: Breakpoints) => void;

/**
 * Breakpoint definitions matching CSS media queries
 */
const BREAKPOINTS = {
  mobile: 767,
  tablet: 768,
  tabletMax: 1023,
  desktop: 1024,
  largeDesktop: 1440,
} as const;

/**
 * BreakpointManager class
 * Manages breakpoint detection and change events
 */
class BreakpointManager {
  private callbacks: Set<BreakpointCallback> = new Set();
  private breakpoints: Breakpoints;
  private resizeTimeout: number | null = null;
  private mediaQueries: Map<string, MediaQueryList> = new Map();

  constructor() {
    this.breakpoints = this.calculateBreakpoints();
    this.init();
  }

  /**
   * Initialize the breakpoint manager
   */
  private init(): void {
    // Setup resize listener with debouncing
    window.addEventListener('resize', this.handleResize.bind(this));

    // Setup media query listeners for more efficient breakpoint detection
    this.setupMediaQueries();

    // Initial calculation
    this.updateBreakpoints();
  }

  /**
   * Setup media query listeners
   */
  private setupMediaQueries(): void {
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
  private handleResize(): void {
    if (this.resizeTimeout !== null) {
      window.clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = window.setTimeout(() => {
      this.updateBreakpoints();
      this.resizeTimeout = null;
    }, 150);
  }

  /**
   * Calculate current breakpoints
   */
  private calculateBreakpoints(): Breakpoints {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const isMobile = width <= BREAKPOINTS.mobile;
    const isTablet = width >= BREAKPOINTS.tablet && width <= BREAKPOINTS.tabletMax;
    const isDesktop = width >= BREAKPOINTS.desktop && width < BREAKPOINTS.largeDesktop;
    const isLargeDesktop = width >= BREAKPOINTS.largeDesktop;

    let currentBreakpoint: Breakpoints['currentBreakpoint'] = 'desktop';
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
  private updateBreakpoints(): void {
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
  private notify(): void {
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
  public subscribe(callback: BreakpointCallback): () => void {
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
  public get current(): Breakpoints {
    return { ...this.breakpoints };
  }

  /**
   * Check if current breakpoint matches
   */
  public is(breakpoint: Breakpoints['currentBreakpoint']): boolean {
    return this.breakpoints.currentBreakpoint === breakpoint;
  }

  /**
   * Check if viewport is at least a certain breakpoint
   */
  public isAtLeast(breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large-desktop'): boolean {
    const order = ['mobile', 'tablet', 'desktop', 'large-desktop'];
    const currentIndex = order.indexOf(this.breakpoints.currentBreakpoint);
    const targetIndex = order.indexOf(breakpoint);
    return currentIndex >= targetIndex;
  }

  /**
   * Check if viewport is at most a certain breakpoint
   */
  public isAtMost(breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large-desktop'): boolean {
    const order = ['mobile', 'tablet', 'desktop', 'large-desktop'];
    const currentIndex = order.indexOf(this.breakpoints.currentBreakpoint);
    const targetIndex = order.indexOf(breakpoint);
    return currentIndex <= targetIndex;
  }

  /**
   * Check if device is touch-enabled
   */
  public get isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - for older browsers
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Get optimal column count for grids based on breakpoint
   */
  public getGridColumns(options: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    largeDesktop?: number;
  }): number {
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
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    if (this.resizeTimeout !== null) {
      window.clearTimeout(this.resizeTimeout);
    }
    this.callbacks.clear();
    this.mediaQueries.clear();
  }
}

// Create singleton instance
const breakpointManager = new BreakpointManager();

/**
 * Composable function for breakpoint detection
 * @returns BreakpointManager instance
 */
export function useBreakpoint(): BreakpointManager {
  return breakpointManager;
}

/**
 * Export singleton for direct access
 */
export default breakpointManager;

/**
 * Add to window for global access in vanilla JS
 */
if (typeof window !== 'undefined') {
  (window as any).breakpointManager = breakpointManager;
  (window as any).useBreakpoint = useBreakpoint;
}
