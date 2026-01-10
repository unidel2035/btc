/**
 * Modal Component
 * Modal dialog with backdrop blur, animations, and keyboard support
 *
 * @example
 * const modal = new Modal({
 *   size: 'md',
 *   title: 'Confirm Action',
 *   closeOnBackdrop: true,
 *   closeOnEscape: true
 * });
 * modal.setContent('<p>Are you sure?</p>');
 * modal.open();
 */

export class Modal {
  constructor(options = {}) {
    this.options = {
      size: 'md', // 'sm' | 'md' | 'lg' | 'xl'
      title: '',
      closeOnBackdrop: true,
      closeOnEscape: true,
      className: '',
      onOpen: null,
      onClose: null,
      ...options
    };

    this.element = null;
    this.backdropElement = null;
    this.modalElement = null;
    this.bodyElement = null;
    this.isOpen = false;
  }

  /**
   * Creates and returns the modal structure
   * @returns {HTMLElement}
   */
  render() {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'ui-modal-backdrop';
    backdrop.style.display = 'none';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'ui-modal';
    modal.classList.add(`ui-modal-${this.options.size}`);

    if (this.options.className) {
      modal.classList.add(this.options.className);
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'ui-modal-header';

    const title = document.createElement('h3');
    title.className = 'ui-modal-title';
    title.textContent = this.options.title;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ui-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    modal.appendChild(header);

    // Create body
    const body = document.createElement('div');
    body.className = 'ui-modal-body';
    modal.appendChild(body);

    backdrop.appendChild(modal);

    // Event listeners
    if (this.options.closeOnBackdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      });
    }

    if (this.options.closeOnEscape) {
      this.escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.escapeHandler);
    }

    this.element = backdrop;
    this.backdropElement = backdrop;
    this.modalElement = modal;
    this.bodyElement = body;

    return backdrop;
  }

  /**
   * Sets the modal body content
   * @param {HTMLElement|string} content
   */
  setContent(content) {
    if (!this.bodyElement) {
      throw new Error('Modal must be rendered before setting content');
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
   * Sets the modal footer
   * @param {HTMLElement|string} content
   */
  setFooter(content) {
    if (!this.modalElement) {
      throw new Error('Modal must be rendered before setting footer');
    }

    // Remove existing footer
    const existingFooter = this.modalElement.querySelector('.ui-modal-footer');
    if (existingFooter) {
      existingFooter.remove();
    }

    const footer = document.createElement('div');
    footer.className = 'ui-modal-footer';

    if (typeof content === 'string') {
      footer.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      footer.appendChild(content);
    }

    this.modalElement.appendChild(footer);

    return this;
  }

  /**
   * Opens the modal
   */
  open() {
    if (!this.element) {
      this.render();
    }

    if (!this.element.parentNode) {
      document.body.appendChild(this.element);
    }

    this.element.style.display = 'flex';
    this.isOpen = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Trigger animation
    requestAnimationFrame(() => {
      this.element.classList.add('fade-enter-active');
    });

    if (this.options.onOpen) {
      this.options.onOpen();
    }

    return this;
  }

  /**
   * Closes the modal
   */
  close() {
    if (!this.isOpen) return;

    this.element.classList.add('fade-leave-active');

    setTimeout(() => {
      this.element.style.display = 'none';
      this.element.classList.remove('fade-enter-active', 'fade-leave-active');
      this.isOpen = false;

      // Restore body scroll
      document.body.style.overflow = '';

      if (this.options.onClose) {
        this.options.onClose();
      }
    }, 200);

    return this;
  }

  /**
   * Destroys the modal element
   */
  destroy() {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    // Restore body scroll
    document.body.style.overflow = '';

    this.element = null;
    this.backdropElement = null;
    this.modalElement = null;
    this.bodyElement = null;
    this.isOpen = false;
  }
}

/**
 * Factory function for creating modals
 * @param {Object} options
 * @returns {Modal}
 */
export function createModal(options) {
  return new Modal(options);
}

export default Modal;
