/**
 * Badge Component
 * Status badges for positions, trades, and risk levels
 *
 * @example
 * const badge = new Badge({
 *   variant: 'success',
 *   text: 'LONG',
 *   dot: true
 * });
 * document.body.appendChild(badge.render());
 */

export class Badge {
  constructor(options = {}) {
    this.options = {
      variant: 'neutral', // 'success' | 'warning' | 'danger' | 'info' | 'neutral'
      text: '',
      dot: false,
      className: '',
      ...options
    };

    this.element = null;
  }

  /**
   * Creates and returns the badge element
   * @returns {HTMLElement}
   */
  render() {
    const badge = document.createElement('span');
    badge.className = 'ui-badge';
    badge.classList.add(`ui-badge-${this.options.variant}`);

    if (this.options.dot) {
      badge.classList.add('ui-badge-dot');
    }

    if (this.options.className) {
      badge.classList.add(this.options.className);
    }

    badge.textContent = this.options.text;

    this.element = badge;
    return badge;
  }

  /**
   * Updates badge text
   * @param {string} text
   */
  setText(text) {
    if (!this.element) {
      throw new Error('Badge must be rendered before setting text');
    }

    this.options.text = text;
    this.element.textContent = text;

    return this;
  }

  /**
   * Updates badge variant
   * @param {string} variant
   */
  setVariant(variant) {
    if (!this.element) {
      throw new Error('Badge must be rendered before setting variant');
    }

    this.element.classList.remove(`ui-badge-${this.options.variant}`);
    this.options.variant = variant;
    this.element.classList.add(`ui-badge-${variant}`);

    return this;
  }

  /**
   * Destroys the badge element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/**
 * Factory function for creating badges
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createBadge(options) {
  const badge = new Badge(options);
  return badge.render();
}

export default Badge;
