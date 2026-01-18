/**
 * Editable Table Widgets
 */

import { EditorView, WidgetType } from '@codemirror/view';
import { TableData } from '../utils/tableParser';
import { serializeMarkdownTable } from '../utils/tableSerializer';
import { setTableSourceMode } from '../plugins/tableEditorEffects';

function cloneTableData(data: TableData): TableData {
  return {
    headers: [...data.headers],
    alignments: [...data.alignments],
    rows: data.rows.map((row) => [...row]),
  };
}

function createEditableCell(
  tag: 'th' | 'td',
  value: string,
  onCommit: (nextValue: string) => void
): HTMLTableCellElement {
  const cell = document.createElement(tag);
  cell.className = 'cm-table-cell';
  cell.contentEditable = 'true';
  cell.spellcheck = false;
  cell.textContent = value;

  const commitIfChanged = () => {
    const nextValue = cell.textContent ?? '';
    if (nextValue === value) return;
    onCommit(nextValue);
  };

  cell.addEventListener('blur', (event) => {
    event.stopPropagation();
    commitIfChanged();
  });

  cell.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitIfChanged();
      cell.blur();
    }
  });

  return cell;
}

export class TableEditorWidget extends WidgetType {
  constructor(
    readonly data: TableData,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: TableEditorWidget): boolean {
    if (this.data.headers.length !== other.data.headers.length) return false;
    if (this.data.rows.length !== other.data.rows.length) return false;

    for (let i = 0; i < this.data.headers.length; i++) {
      if (this.data.headers[i] !== other.data.headers[i]) return false;
      if (this.data.alignments[i] !== other.data.alignments[i]) return false;
    }

    for (let i = 0; i < this.data.rows.length; i++) {
      for (let j = 0; j < this.data.headers.length; j++) {
        if (this.data.rows[i][j] !== other.data.rows[i][j]) return false;
      }
    }

    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-table-editor';

    const toolbar = document.createElement('div');
    toolbar.className = 'cm-table-toolbar';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'cm-table-toggle';
    toggleButton.textContent = 'MD';
    toggleButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from },
        effects: setTableSourceMode.of({
          from: this.from,
          to: this.to,
          showSource: true,
        }),
      });
    });

    toolbar.appendChild(toggleButton);
    container.appendChild(toolbar);

    const table = document.createElement('table');

    const commitHeader = (colIndex: number, nextValue: string) => {
      const updated = cloneTableData(this.data);
      updated.headers[colIndex] = nextValue;
      const markdown = serializeMarkdownTable(updated);
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: markdown },
      });
    };

    const commitCell = (rowIndex: number, colIndex: number, nextValue: string) => {
      const updated = cloneTableData(this.data);
      updated.rows[rowIndex][colIndex] = nextValue;
      const markdown = serializeMarkdownTable(updated);
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: markdown },
      });
    };

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    this.data.headers.forEach((header, idx) => {
      const th = createEditableCell('th', header, (nextValue) =>
        commitHeader(idx, nextValue)
      );
      if (this.data.alignments[idx]) {
        th.style.textAlign = this.data.alignments[idx]!;
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.data.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      row.forEach((cellValue, colIndex) => {
        const td = createEditableCell('td', cellValue, (nextValue) =>
          commitCell(rowIndex, colIndex, nextValue)
        );
        if (this.data.alignments[colIndex]) {
          td.style.textAlign = this.data.alignments[colIndex]!;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class TableSourceToggleWidget extends WidgetType {
  constructor(readonly from: number, readonly to: number) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-table-source-toggle';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-table-toggle';
    button.textContent = 'Table';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      view.dispatch({
        effects: setTableSourceMode.of({
          from: this.from,
          to: this.to,
          showSource: false,
        }),
      });
    });

    container.appendChild(button);
    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export function createTableEditorWidget(
  data: TableData,
  from: number,
  to: number
): TableEditorWidget {
  return new TableEditorWidget(data, from, to);
}

export function createTableSourceToggleWidget(
  from: number,
  to: number
): TableSourceToggleWidget {
  return new TableSourceToggleWidget(from, to);
}
