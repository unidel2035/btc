/**
 * Card Component
 * Modern card component with multiple variants and hover effects
 *
 * @example
 * const card = new Card({
 *   variant: 'gradient',
 *   hoverable: true,
 *   title: 'Trading Stats',
 *   subtitle: 'Real-time metrics'
 * });
 * document.body.appendChild(card.render());
 */

export class Card {
  constructor(options = {}) {
    this.options = {
      variant: 'default', // 'default' | 'gradient' | 'glass' | 'outlined'
      hoverable: false,
      title: '',
      subtitle: '',
      className: '',
      ...options
    };

    this.element = null;
  }

  /**
   * Creates and returns the card element
   * @returns {HTMLElement}
   */
  render() {
    const card = document.createElement('div');

    // Base card class
    card.className = 'ui-card';

    // Add variant class
    card.classList.add(`ui-card-${this.options.variant}`);

    // Add hoverable class
    if (this.options.hoverable) {
      card.classList.add('ui-card-hoverable');
    }

    // Add custom classes
    if (this.options.className) {
      card.classList.add(this.options.className);
    }

    // Create header if title or subtitle provided
    if (this.options.title || this.options.subtitle) {
      const header = document.createElement('div');
      header.className = 'ui-card-header';

      if (this.options.title) {
        const title = document.createElement('h3');
        title.className = 'ui-card-title';
        title.textContent = this.options.title;
        header.appendChild(title);
      }

      if (this.options.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.className = 'ui-card-subtitle';
        subtitle.textContent = this.options.subtitle;
        header.appendChild(subtitle);
      }

      card.appendChild(header);
    }

    // Create body
    const body = document.createElement('div');
    body.className = 'ui-card-body';
    card.appendChild(body);

    // Store reference
    this.element = card;
    this.bodyElement = body;

    return card;
  }

  /**
   * Sets the body content of the card
   * @param {HTMLElement|string} content
   */
  setContent(content) {
    if (!this.bodyElement) {
      throw new Error('Card must be rendered before setting content');
    }

    if (typeof content === 'string') {
      this.bodyElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.bodyElement.innerHTML = '';
      this.bodyElement.appendChild(content);
    }

    return this;
  }

  /**
   * Adds a footer to the card
   * @param {HTMLElement|string} content
   */
  setFooter(content) {
    if (!this.element) {
      throw new Error('Card must be rendered before setting footer');
    }

    // Remove existing footer
    const existingFooter = this.element.querySelector('.ui-card-footer');
    if (existingFooter) {
      existingFooter.remove();
    }

    const footer = document.createElement('div');
    footer.className = 'ui-card-footer';

    if (typeof content === 'string') {
      footer.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      footer.appendChild(content);
    }

    this.element.appendChild(footer);

    return this;
  }

  /**
   * Updates the card variant
   * @param {string} variant
   */
  setVariant(variant) {
    if (!this.element) {
      throw new Error('Card must be rendered before setting variant');
    }

    // Remove old variant class
    this.element.classList.remove(`ui-card-${this.options.variant}`);

    // Add new variant class
    this.options.variant = variant;
    this.element.classList.add(`ui-card-${variant}`);

    return this;
  }

  /**
   * Destroys the card element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.bodyElement = null;
  }
}

/**
 * Factory function for creating cards
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createCard(options) {
  const card = new Card(options);
  return card.render();
}

export default Card;
