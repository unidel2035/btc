/**
 * Button Component
 * Modern button with ripple effect, loading state, and multiple variants
 *
 * @example
 * const button = new Button({
 *   variant: 'primary',
 *   size: 'md',
 *   text: 'Click Me',
 *   onClick: () => console.log('Clicked!')
 * });
 * document.body.appendChild(button.render());
 */

export class Button {
  constructor(options = {}) {
    this.options = {
      variant: 'primary', // 'primary' | 'success' | 'danger' | 'secondary' | 'ghost' | 'link'
      size: 'md', // 'sm' | 'md' | 'lg'
      text: '',
      icon: null,
      iconPosition: 'left', // 'left' | 'right'
      disabled: false,
      loading: false,
      ripple: true,
      className: '',
      onClick: null,
      ...options
    };

    this.element = null;
    this.isLoading = this.options.loading;
  }

  /**
   * Creates and returns the button element
   * @returns {HTMLElement}
   */
  render() {
    const button = document.createElement('button');
    button.type = 'button';

    // Base classes
    button.className = 'ui-btn';
    button.classList.add(`ui-btn-${this.options.variant}`);
    button.classList.add(`ui-btn-${this.options.size}`);

    // Add ripple container class
    if (this.options.ripple) {
      button.classList.add('ripple-container');
    }

    // Add custom classes
    if (this.options.className) {
      button.classList.add(this.options.className);
    }

    // Set disabled state
    if (this.options.disabled) {
      button.disabled = true;
    }

    // Create button content
    const content = this.createContent();
    button.appendChild(content);

    // Add click handler
    if (this.options.onClick) {
      button.addEventListener('click', (e) => {
        if (this.options.ripple && !this.isLoading) {
          this.createRipple(e, button);
        }
        if (!this.isLoading && !this.options.disabled) {
          this.options.onClick(e);
        }
      });
    } else if (this.options.ripple) {
      button.addEventListener('click', (e) => {
        if (!this.isLoading) {
          this.createRipple(e, button);
        }
      });
    }

    this.element = button;
    this.contentElement = content;

    return button;
  }

  /**
   * Creates the button content (text, icon, spinner)
   * @returns {DocumentFragment}
   */
  createContent() {
    const fragment = document.createDocumentFragment();

    // Add icon (left position)
    if (this.options.icon && this.options.iconPosition === 'left' && !this.isLoading) {
      const icon = document.createElement('span');
      icon.innerHTML = this.options.icon;
      fragment.appendChild(icon);
    }

    // Add loading spinner
    if (this.isLoading) {
      const spinner = document.createElement('span');
      spinner.className = 'ui-btn-spinner';
      fragment.appendChild(spinner);
    }

    // Add text
    if (this.options.text) {
      const text = document.createElement('span');
      text.textContent = this.options.text;
      fragment.appendChild(text);
    }

    // Add icon (right position)
    if (this.options.icon && this.options.iconPosition === 'right' && !this.isLoading) {
      const icon = document.createElement('span');
      icon.innerHTML = this.options.icon;
      fragment.appendChild(icon);
    }

    return fragment;
  }

  /**
   * Creates ripple effect on button click
   * @param {Event} event
   * @param {HTMLElement} button
   */
  createRipple(event, button) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Sets loading state
   * @param {boolean} loading
   */
  setLoading(loading) {
    if (!this.element) {
      throw new Error('Button must be rendered before setting loading state');
    }

    this.isLoading = loading;

    if (loading) {
      this.element.classList.add('ui-btn-loading');
    } else {
      this.element.classList.remove('ui-btn-loading');
    }

    // Re-create content
    this.contentElement.remove();
    this.contentElement = this.createContent();
    this.element.appendChild(this.contentElement);

    return this;
  }

  /**
   * Sets disabled state
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    if (!this.element) {
      throw new Error('Button must be rendered before setting disabled state');
    }

    this.options.disabled = disabled;
    this.element.disabled = disabled;

    return this;
  }

  /**
   * Updates button text
   * @param {string} text
   */
  setText(text) {
    if (!this.element) {
      throw new Error('Button must be rendered before setting text');
    }

    this.options.text = text;

    // Re-create content
    this.contentElement.remove();
    this.contentElement = this.createContent();
    this.element.appendChild(this.contentElement);

    return this;
  }

  /**
   * Updates button variant
   * @param {string} variant
   */
  setVariant(variant) {
    if (!this.element) {
      throw new Error('Button must be rendered before setting variant');
    }

    // Remove old variant class
    this.element.classList.remove(`ui-btn-${this.options.variant}`);

    // Add new variant class
    this.options.variant = variant;
    this.element.classList.add(`ui-btn-${variant}`);

    return this;
  }

  /**
   * Destroys the button element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.contentElement = null;
  }
}

/**
 * Factory function for creating buttons
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createButton(options) {
  const button = new Button(options);
  return button.render();
}

export default Button;
