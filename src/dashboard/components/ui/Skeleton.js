/**
 * Skeleton Loader Component
 * Loading placeholders with shimmer animation
 *
 * @example
 * const skeleton = new Skeleton({
 *   type: 'text',
 *   count: 3
 * });
 * document.body.appendChild(skeleton.render());
 */

export class Skeleton {
  constructor(options = {}) {
    this.options = {
      type: 'text', // 'text' | 'title' | 'circle' | 'rectangle' | 'table'
      count: 1,
      width: null,
      height: null,
      className: '',
      ...options
    };

    this.element = null;
  }

  /**
   * Creates and returns the skeleton element
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');

    if (this.options.className) {
      container.classList.add(this.options.className);
    }

    if (this.options.type === 'table') {
      return this.renderTable();
    }

    for (let i = 0; i < this.options.count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `ui-skeleton ui-skeleton-${this.options.type}`;

      if (this.options.width) {
        skeleton.style.width = typeof this.options.width === 'number'
          ? `${this.options.width}px`
          : this.options.width;
      }

      if (this.options.height) {
        skeleton.style.height = typeof this.options.height === 'number'
          ? `${this.options.height}px`
          : this.options.height;
      }

      container.appendChild(skeleton);
    }

    this.element = container;
    return container;
  }

  /**
   * Renders a table skeleton
   * @returns {HTMLElement}
   */
  renderTable() {
    const container = document.createElement('div');
    container.className = 'ui-skeleton-table';

    const rows = this.options.count || 5;

    for (let i = 0; i < rows; i++) {
      const row = document.createElement('div');
      row.className = 'ui-skeleton-table-row';

      for (let j = 0; j < 4; j++) {
        const cell = document.createElement('div');
        cell.className = 'ui-skeleton ui-skeleton-table-cell';
        row.appendChild(cell);
      }

      container.appendChild(row);
    }

    this.element = container;
    return container;
  }

  /**
   * Destroys the skeleton element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/**
 * Factory function for creating skeletons
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createSkeleton(options) {
  const skeleton = new Skeleton(options);
  return skeleton.render();
}

export default Skeleton;
