/**
 * Table Widget
 *
 * Renders Markdown table as HTML table
 */

import { WidgetType } from '@codemirror/view';
import { TableData } from '../utils/tableParser';

/**
 * Table Widget class
 */
export class TableWidget extends WidgetType {
  constructor(readonly data: TableData) {
    super();
  }

  /**
   * Check if two widgets are equal
   */
  eq(other: TableWidget): boolean {
    if (this.data.headers.length !== other.data.headers.length) return false;
    if (this.data.rows.length !== other.data.rows.length) return false;

    // Compare headers
    for (let i = 0; i < this.data.headers.length; i++) {
      if (this.data.headers[i] !== other.data.headers[i]) return false;
      if (this.data.alignments[i] !== other.data.alignments[i]) return false;
    }

    // Compare data rows
    for (let i = 0; i < this.data.rows.length; i++) {
      for (let j = 0; j < this.data.headers.length; j++) {
        if (this.data.rows[i][j] !== other.data.rows[i][j]) return false;
      }
    }

    return true;
  }

  /**
   * Render to DOM element
   */
  toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-table-widget';

    const table = document.createElement('table');

    // Render header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    this.data.headers.forEach((header, idx) => {
      const th = document.createElement('th');
      th.textContent = header;
      if (this.data.alignments[idx]) {
        th.style.textAlign = this.data.alignments[idx]!;
      }
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Render data rows
    const tbody = document.createElement('tbody');

    this.data.rows.forEach((row) => {
      const tr = document.createElement('tr');

      row.forEach((cell, idx) => {
        const td = document.createElement('td');
        td.textContent = cell;
        if (this.data.alignments[idx]) {
          td.style.textAlign = this.data.alignments[idx]!;
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  }

  /**
   * Whether to ignore events
   *
   * Return false to allow click to enter edit mode
   */
  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Create table widget
 */
export function createTableWidget(data: TableData): TableWidget {
  return new TableWidget(data);
}
