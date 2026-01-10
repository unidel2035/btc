/**
 * Progress Bar Component
 * Animated progress bar with color variants
 *
 * @example
 * const progress = new Progress({
 *   value: 75,
 *   variant: 'success',
 *   showLabel: true,
 *   animated: true
 * });
 * document.body.appendChild(progress.render());
 */

export class Progress {
  constructor(options = {}) {
    this.options = {
      value: 0, // 0-100
      variant: 'primary', // 'primary' | 'success' | 'warning' | 'danger' | 'info'
      size: 'md', // 'sm' | 'md' | 'lg'
      showLabel: false,
      animated: false,
      className: '',
      ...options
    };

    this.element = null;
    this.barElement = null;
    this.labelElement = null;
  }

  /**
   * Creates and returns the progress bar element
   * @returns {HTMLElement}
   */
  render() {
    const wrapper = this.options.showLabel
      ? document.createElement('div')
      : document.createElement('div');

    if (this.options.showLabel) {
      wrapper.className = 'ui-progress-with-label';
    }

    if (this.options.className) {
      wrapper.classList.add(this.options.className);
    }

    // Create progress container
    const container = document.createElement('div');
    container.className = `ui-progress-container ui-progress-${this.options.size}`;

    // Create progress bar
    const bar = document.createElement('div');
    bar.className = `ui-progress-bar ui-progress-${this.options.variant}`;
    bar.style.width = `${this.options.value}%`;

    if (this.options.animated) {
      bar.classList.add('ui-progress-animated');
    }

    container.appendChild(bar);

    // Add label if needed
    if (this.options.showLabel) {
      const label = document.createElement('span');
      label.className = 'ui-progress-label';
      label.textContent = `${this.options.value}%`;

      wrapper.appendChild(container);
      wrapper.appendChild(label);

      this.labelElement = label;
    } else {
      wrapper.appendChild(container);
    }

    this.element = wrapper;
    this.barElement = bar;

    return wrapper;
  }

  /**
   * Updates progress value
   * @param {number} value - Value from 0 to 100
   */
  setValue(value) {
    if (!this.barElement) {
      throw new Error('Progress must be rendered before setting value');
    }

    value = Math.max(0, Math.min(100, value));
    this.options.value = value;

    this.barElement.style.width = `${value}%`;

    if (this.labelElement) {
      this.labelElement.textContent = `${value}%`;
    }

    return this;
  }

  /**
   * Updates progress variant
   * @param {string} variant
   */
  setVariant(variant) {
    if (!this.barElement) {
      throw new Error('Progress must be rendered before setting variant');
    }

    this.barElement.classList.remove(`ui-progress-${this.options.variant}`);
    this.options.variant = variant;
    this.barElement.classList.add(`ui-progress-${variant}`);

    return this;
  }

  /**
   * Increments progress value
   * @param {number} amount
   */
  increment(amount = 1) {
    return this.setValue(this.options.value + amount);
  }

  /**
   * Decrements progress value
   * @param {number} amount
   */
  decrement(amount = 1) {
    return this.setValue(this.options.value - amount);
  }

  /**
   * Destroys the progress element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.barElement = null;
    this.labelElement = null;
  }
}

/**
 * Factory function for creating progress bars
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createProgress(options) {
  const progress = new Progress(options);
  return progress.render();
}

export default Progress;
