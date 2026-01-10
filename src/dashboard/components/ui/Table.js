/**
 * Table Component
 * Sortable table with custom cell renderers and responsive design
 *
 * @example
 * const table = new Table({
 *   columns: [
 *     { key: 'symbol', label: 'Symbol', sortable: true },
 *     { key: 'price', label: 'Price', sortable: true }
 *   ],
 *   data: [
 *     { symbol: 'BTC/USDT', price: 50000 },
 *     { symbol: 'ETH/USDT', price: 3000 }
 *   ],
 *   striped: true
 * });
 * document.body.appendChild(table.render());
 */

export class Table {
  constructor(options = {}) {
    this.options = {
      columns: [], // [{ key, label, sortable, render }]
      data: [],
      striped: false,
      hoverable: true,
      className: '',
      onSort: null,
      ...options
    };

    this.element = null;
    this.tableElement = null;
    this.tbodyElement = null;
    this.sortColumn = null;
    this.sortDirection = null; // 'asc' | 'desc'
  }

  /**
   * Creates and returns the table element
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');
    container.className = 'ui-table-container';

    if (this.options.className) {
      container.classList.add(this.options.className);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'ui-table-wrapper';

    const table = document.createElement('table');
    table.className = 'ui-table';

    // Create thead
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    this.options.columns.forEach((column) => {
      const th = document.createElement('th');
      th.textContent = column.label;

      if (column.sortable) {
        th.classList.add('sortable');
        th.addEventListener('click', () => this.sort(column.key));
      }

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create tbody
    const tbody = document.createElement('tbody');
    this.renderRows(tbody);
    table.appendChild(tbody);

    wrapper.appendChild(table);
    container.appendChild(wrapper);

    this.element = container;
    this.tableElement = table;
    this.tbodyElement = tbody;
    this.theadElement = thead;

    return container;
  }

  /**
   * Renders table rows
   * @param {HTMLElement} tbody
   */
  renderRows(tbody) {
    tbody.innerHTML = '';

    this.options.data.forEach((row) => {
      const tr = document.createElement('tr');

      if (this.options.striped) {
        tr.classList.add('striped');
      }

      this.options.columns.forEach((column) => {
        const td = document.createElement('td');

        // Use custom renderer if provided
        if (column.render) {
          const content = column.render(row[column.key], row);
          if (typeof content === 'string') {
            td.innerHTML = content;
          } else if (content instanceof HTMLElement) {
            td.appendChild(content);
          }
        } else {
          td.textContent = row[column.key];
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  /**
   * Sorts the table by column
   * @param {string} columnKey
   */
  sort(columnKey) {
    // Determine sort direction
    if (this.sortColumn === columnKey) {
      // Toggle direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      this.sortColumn = columnKey;
      this.sortDirection = 'asc';
    }

    // Sort data
    this.options.data.sort((a, b) => {
      const aVal = a[columnKey];
      const bVal = b[columnKey];

      let comparison = 0;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // Update UI
    this.updateSortIndicators();
    this.renderRows(this.tbodyElement);

    // Callback
    if (this.options.onSort) {
      this.options.onSort(columnKey, this.sortDirection);
    }
  }

  /**
   * Updates sort indicators in header
   */
  updateSortIndicators() {
    const headers = this.theadElement.querySelectorAll('th.sortable');

    headers.forEach((th, index) => {
      const column = this.options.columns.filter(c => c.sortable)[index];

      th.classList.remove('sort-asc', 'sort-desc');

      if (column && column.key === this.sortColumn) {
        th.classList.add(`sort-${this.sortDirection}`);
      }
    });
  }

  /**
   * Updates table data
   * @param {Array} data
   */
  setData(data) {
    if (!this.tbodyElement) {
      throw new Error('Table must be rendered before setting data');
    }

    this.options.data = data;
    this.renderRows(this.tbodyElement);

    return this;
  }

  /**
   * Adds a row to the table
   * @param {Object} row
   */
  addRow(row) {
    if (!this.tbodyElement) {
      throw new Error('Table must be rendered before adding rows');
    }

    this.options.data.push(row);
    this.renderRows(this.tbodyElement);

    return this;
  }

  /**
   * Destroys the table element
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.tableElement = null;
    this.tbodyElement = null;
    this.theadElement = null;
  }
}

/**
 * Factory function for creating tables
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function createTable(options) {
  const table = new Table(options);
  return table.render();
}

export default Table;
