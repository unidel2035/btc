/**
 * Input Component
 * Form input with prefix/suffix slots, error states, and validation
 *
 * @example
 * const input = new Input({
 *   label: 'Amount',
 *   type: 'number',
 *   prefix: '$',
 *   placeholder: '0.00',
 *   onChange: (value) => console.log(value)
 * });
 * document.body.appendChild(input.render());
 */

export class Input {
  constructor(options = {}) {
    this.options = {
      label: '',
      type: 'text',
      placeholder: '',
      value: '',
      prefix: null,
      suffix: null,
      disabled: false,
      error: null,
      className: '',
      onChange: null,
      onFocus: null,
      onBlur: null,
      ...options
    };

    this.element = null;
    this.inputElement = null;
    this.errorElement = null;
  }

  /**
   * Creates and returns the input element
   * @returns {HTMLElement}
   */
  render() {
    const group = document.createElement('div');
    group.className = 'ui-input-group';

    if (this.options.error) {
      group.classList.add('ui-input-error');
    }

    if (this.options.className) {
      group.classList.add(this.options.className);
    }

    // Create label
    if (this.options.label) {
      const label = document.createElement('label');
      label.className = 'ui-input-label';
      label.textContent = this.options.label;
      group.appendChild(label);
    }

    // Create input wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'ui-input-wrapper';

    // Add prefix
    if (this.options.prefix) {
      const prefix = document.createElement('span');
      prefix.className = 'ui-input-prefix';
      prefix.textContent = this.options.prefix;
      wrapper.appendChild(prefix);
    }

    // Create input
    const input = document.createElement('input');
    input.className = 'ui-input';
    input.type = this.options.type;
    input.placeholder = this.options.placeholder;
    input.value = this.options.value;
    input.disabled = this.options.disabled;

    if (this.options.prefix) {
      input.classList.add('has-prefix');
    }

    if (this.options.suffix) {
      input.classList.add('has-suffix');
    }

    // Event listeners
    if (this.options.onChange) {
      input.addEventListener('input', (e) => {
        this.options.onChange(e.target.value, e);
      });
    }

    if (this.options.onFocus) {
      input.addEventListener('focus', this.options.onFocus);
    }

    if (this.options.onBlur) {
      input.addEventListener('blur', this.options.onBlur);
    }

    wrapper.appendChild(input);

    // Add suffix
    if (this.options.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'ui-input-suffix';
      suffix.textContent = this.options.suffix;
      wrapper.appendChild(suffix);
    }

    group.appendChild(wrapper);

    // Add error message
    if (this.options.error) {
      const error = document.createElement('div');
      error.className = 'ui-input-error-message';
      error.textContent = this.options.error;
      group.appendChild(error);
      this.errorElement = error;
    }

    this.element = group;
    this.inputElement = input;

    return group;
  }

  /**
   * Gets the input value
   * @returns {string}
   */
  getValue() {
    if (!this.inputElement) {
      throw new Error('Input must be rendered before getting value');
    }

    return this.inputElement.value;
  }

  /**
   * Sets the input value
   * @param {string} value
   */
  setValue(value) {
    if (!this.inputElement) {
      throw new Error('Input must be rendered before setting value');
    }

    this.options.value = value;
    this.inputElement.value = value;

    return this;
  }

  /**
   * Sets error state and message
   * @param {string|null} error
   */
  setError(error) {
    if (!this.element) {
      throw new Error('Input must be rendered before setting error');
    }

    this.options.error = error;

    if (error) {
      this.element.classList.add('ui-input-error');

      if (this.errorElement) {
        this.errorElement.textContent = error;
      } else {
        const errorEl = document.createElement('div');
        errorEl.className = 'ui-input-error-message';
        errorEl.textContent = error;
        this.element.appendChild(errorEl);
        this.errorElement = errorEl;
      }
    } else {
      this.element.classList.remove('ui-input-error');

      if (this.errorElement) {
        this.errorElement.remove();
        this.errorElement = null;
      }
    }

    return this;
  }

  /**
   * Sets disabled state
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    if (!this.inputElement) {
      throw new Error('Input must be rendered before setting disabled state');
    }

    this.options.disabled = disabled;
    this.inputElement.disabled = disabled;

    return this;
  }

  /**
   * Focuses the input
   */
  focus() {
    if (!this.inputElement) {
      throw new Error('Input must be rendered before focusing');
    }

    this.inputElement.focus();

    return this;
  }

  /**
   * Destroys the input element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.inputElement = null;
    this.errorElement = null;
  }
}

/**
 * Factory function for creating inputs
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createInput(options) {
  const input = new Input(options);
  return input.render();
}

export default Input;
