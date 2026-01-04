/**
 * 表格 Widget
 *
 * 将 Markdown 表格渲染为 HTML 表格
 */

import { WidgetType } from '@codemirror/view';
import { TableData } from '../utils/tableParser';

/**
 * 表格 Widget 类
 */
export class TableWidget extends WidgetType {
  constructor(readonly data: TableData) {
    super();
  }

  /**
   * 判断两个 Widget 是否相等
   */
  eq(other: TableWidget): boolean {
    if (this.data.headers.length !== other.data.headers.length) return false;
    if (this.data.rows.length !== other.data.rows.length) return false;

    // 比较表头
    for (let i = 0; i < this.data.headers.length; i++) {
      if (this.data.headers[i] !== other.data.headers[i]) return false;
      if (this.data.alignments[i] !== other.data.alignments[i]) return false;
    }

    // 比较数据行
    for (let i = 0; i < this.data.rows.length; i++) {
      for (let j = 0; j < this.data.headers.length; j++) {
        if (this.data.rows[i][j] !== other.data.rows[i][j]) return false;
      }
    }

    return true;
  }

  /**
   * 渲染为 DOM 元素
   */
  toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-table-widget';

    const table = document.createElement('table');

    // 渲染表头
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

    // 渲染数据行
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
   * 是否忽略事件
   *
   * 返回 false 允许点击表格进入编辑模式
   */
  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * 创建表格 Widget
 */
export function createTableWidget(data: TableData): TableWidget {
  return new TableWidget(data);
}
