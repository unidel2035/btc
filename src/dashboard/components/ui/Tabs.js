/**
 * Tabs Component
 * Tabbed navigation with smooth transitions
 *
 * @example
 * const tabs = new Tabs({
 *   tabs: [
 *     { id: 'overview', label: 'Overview', content: '<p>Overview content</p>' },
 *     { id: 'details', label: 'Details', content: '<p>Details content</p>' }
 *   ],
 *   activeTab: 'overview',
 *   onChange: (tabId) => console.log('Tab changed:', tabId)
 * });
 * document.body.appendChild(tabs.render());
 */

export class Tabs {
  constructor(options = {}) {
    this.options = {
      tabs: [], // [{ id, label, content }]
      activeTab: null,
      className: '',
      onChange: null,
      ...options
    };

    // Set active tab to first if not specified
    if (!this.options.activeTab && this.options.tabs.length > 0) {
      this.options.activeTab = this.options.tabs[0].id;
    }

    this.element = null;
    this.tabElements = [];
    this.contentElements = [];
  }

  /**
   * Creates and returns the tabs element
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');
    container.className = 'ui-tabs';

    if (this.options.className) {
      container.classList.add(this.options.className);
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'ui-tabs-header';

    this.options.tabs.forEach((tab) => {
      const tabButton = document.createElement('button');
      tabButton.className = 'ui-tab';
      tabButton.textContent = tab.label;
      tabButton.dataset.tabId = tab.id;

      if (tab.id === this.options.activeTab) {
        tabButton.classList.add('active');
      }

      tabButton.addEventListener('click', () => this.setActiveTab(tab.id));

      header.appendChild(tabButton);
      this.tabElements.push(tabButton);
    });

    container.appendChild(header);

    // Create content containers
    this.options.tabs.forEach((tab) => {
      const content = document.createElement('div');
      content.className = 'ui-tab-content';
      content.dataset.tabId = tab.id;

      if (tab.id === this.options.activeTab) {
        content.classList.add('active');
      }

      if (typeof tab.content === 'string') {
        content.innerHTML = tab.content;
      } else if (tab.content instanceof HTMLElement) {
        content.appendChild(tab.content);
      }

      container.appendChild(content);
      this.contentElements.push(content);
    });

    this.element = container;

    return container;
  }

  /**
   * Sets the active tab
   * @param {string} tabId
   */
  setActiveTab(tabId) {
    if (!this.element) {
      throw new Error('Tabs must be rendered before setting active tab');
    }

    const tab = this.options.tabs.find(t => t.id === tabId);
    if (!tab) {
      console.warn(`Tab with id "${tabId}" not found`);
      return this;
    }

    const previousTab = this.options.activeTab;
    this.options.activeTab = tabId;

    // Update tab buttons
    this.tabElements.forEach((tabEl) => {
      if (tabEl.dataset.tabId === tabId) {
        tabEl.classList.add('active');
      } else {
        tabEl.classList.remove('active');
      }
    });

    // Update content
    this.contentElements.forEach((contentEl) => {
      if (contentEl.dataset.tabId === tabId) {
        contentEl.classList.add('active');
      } else {
        contentEl.classList.remove('active');
      }
    });

    // Callback
    if (this.options.onChange && previousTab !== tabId) {
      this.options.onChange(tabId, previousTab);
    }

    return this;
  }

  /**
   * Gets the active tab id
   * @returns {string}
   */
  getActiveTab() {
    return this.options.activeTab;
  }

  /**
   * Adds a new tab
   * @param {Object} tab - { id, label, content }
   */
  addTab(tab) {
    if (!this.element) {
      throw new Error('Tabs must be rendered before adding tabs');
    }

    this.options.tabs.push(tab);

    // Add tab button
    const header = this.element.querySelector('.ui-tabs-header');
    const tabButton = document.createElement('button');
    tabButton.className = 'ui-tab';
    tabButton.textContent = tab.label;
    tabButton.dataset.tabId = tab.id;
    tabButton.addEventListener('click', () => this.setActiveTab(tab.id));
    header.appendChild(tabButton);
    this.tabElements.push(tabButton);

    // Add content
    const content = document.createElement('div');
    content.className = 'ui-tab-content';
    content.dataset.tabId = tab.id;

    if (typeof tab.content === 'string') {
      content.innerHTML = tab.content;
    } else if (tab.content instanceof HTMLElement) {
      content.appendChild(tab.content);
    }

    this.element.appendChild(content);
    this.contentElements.push(content);

    return this;
  }

  /**
   * Removes a tab
   * @param {string} tabId
   */
  removeTab(tabId) {
    if (!this.element) {
      throw new Error('Tabs must be rendered before removing tabs');
    }

    const index = this.options.tabs.findIndex(t => t.id === tabId);
    if (index === -1) {
      console.warn(`Tab with id "${tabId}" not found`);
      return this;
    }

    // Remove from options
    this.options.tabs.splice(index, 1);

    // Remove tab button
    const tabButton = this.tabElements[index];
    if (tabButton) {
      tabButton.remove();
      this.tabElements.splice(index, 1);
    }

    // Remove content
    const content = this.contentElements[index];
    if (content) {
      content.remove();
      this.contentElements.splice(index, 1);
    }

    // If removed tab was active, activate first tab
    if (this.options.activeTab === tabId && this.options.tabs.length > 0) {
      this.setActiveTab(this.options.tabs[0].id);
    }

    return this;
  }

  /**
   * Updates tab content
   * @param {string} tabId
   * @param {HTMLElement|string} content
   */
  updateTabContent(tabId, content) {
    if (!this.element) {
      throw new Error('Tabs must be rendered before updating content');
    }

    const tab = this.options.tabs.find(t => t.id === tabId);
    if (!tab) {
      console.warn(`Tab with id "${tabId}" not found`);
      return this;
    }

    tab.content = content;

    const contentEl = this.contentElements.find(el => el.dataset.tabId === tabId);
    if (contentEl) {
      if (typeof content === 'string') {
        contentEl.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        contentEl.innerHTML = '';
        contentEl.appendChild(content);
      }
    }

    return this;
  }

  /**
   * Destroys the tabs element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.tabElements = [];
    this.contentElements = [];
  }
}

/**
 * Factory function for creating tabs
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createTabs(options) {
  const tabs = new Tabs(options);
  return tabs.render();
}

export default Tabs;
