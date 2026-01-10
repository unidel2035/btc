/**
 * Tooltip Component
 * Hoverable tooltip with multiple positions
 *
 * @example
 * const tooltip = new Tooltip({
 *   position: 'top',
 *   text: 'This is a tooltip'
 * });
 * const button = document.createElement('button');
 * button.textContent = 'Hover me';
 * document.body.appendChild(tooltip.attach(button));
 */

export class Tooltip {
  constructor(options = {}) {
    this.options = {
      position: 'top', // 'top' | 'bottom' | 'left' | 'right'
      text: '',
      delay: 200, // ms
      className: '',
      ...options
    };

    this.container = null;
    this.tooltipElement = null;
    this.showTimeout = null;
  }

  /**
   * Attaches tooltip to a target element
   * @param {HTMLElement} target
   * @returns {HTMLElement} Container with target and tooltip
   */
  attach(target) {
    // Create container
    const container = document.createElement('div');
    container.className = 'ui-tooltip-container';

    // Move target into container
    if (target.parentNode) {
      target.parentNode.insertBefore(container, target);
    }
    container.appendChild(target);

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = `ui-tooltip ui-tooltip-${this.options.position}`;
    tooltip.textContent = this.options.text;
    tooltip.style.display = 'none';

    if (this.options.className) {
      tooltip.classList.add(this.options.className);
    }

    container.appendChild(tooltip);

    // Event listeners
    target.addEventListener('mouseenter', () => this.show());
    target.addEventListener('mouseleave', () => this.hide());
    target.addEventListener('focus', () => this.show());
    target.addEventListener('blur', () => this.hide());

    this.container = container;
    this.tooltipElement = tooltip;

    return container;
  }

  /**
   * Shows the tooltip
   */
  show() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }

    this.showTimeout = setTimeout(() => {
      if (this.tooltipElement) {
        this.tooltipElement.style.display = 'block';
        this.tooltipElement.classList.add('fade-enter-active');
      }
    }, this.options.delay);
  }

  /**
   * Hides the tooltip
   */
  hide() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }

    if (this.tooltipElement) {
      this.tooltipElement.classList.remove('fade-enter-active');
      this.tooltipElement.classList.add('fade-leave-active');

      setTimeout(() => {
        if (this.tooltipElement) {
          this.tooltipElement.style.display = 'none';
          this.tooltipElement.classList.remove('fade-leave-active');
        }
      }, 200);
    }
  }

  /**
   * Updates tooltip text
   * @param {string} text
   */
  setText(text) {
    if (!this.tooltipElement) {
      throw new Error('Tooltip must be attached before setting text');
    }

    this.options.text = text;
    this.tooltipElement.textContent = text;

    return this;
  }

  /**
   * Updates tooltip position
   * @param {string} position
   */
  setPosition(position) {
    if (!this.tooltipElement) {
      throw new Error('Tooltip must be attached before setting position');
    }

    this.tooltipElement.classList.remove(`ui-tooltip-${this.options.position}`);
    this.options.position = position;
    this.tooltipElement.classList.add(`ui-tooltip-${position}`);

    return this;
  }

  /**
   * Destroys the tooltip
   */
  destroy() {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }

    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }

    this.container = null;
    this.tooltipElement = null;
  }
}

/**
 * Factory function for creating tooltips
 * @param {Object} options
 * @returns {Tooltip}
 */
export function createTooltip(options) {
  return new Tooltip(options);
}

export default Tooltip;
