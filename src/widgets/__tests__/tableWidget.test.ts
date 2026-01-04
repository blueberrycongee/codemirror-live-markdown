import { describe, it, expect, beforeEach } from 'vitest';
import { TableWidget } from '../tableWidget';
import { TableData } from '../../utils/tableParser';

describe('TableWidget', () => {
  beforeEach(() => {
    // Ensure DOM environment
  });

  const simpleData: TableData = {
    headers: ['Name', 'Age'],
    alignments: [null, null],
    rows: [
      ['Alice', '25'],
      ['Bob', '30'],
    ],
  };

  const alignedData: TableData = {
    headers: ['Left', 'Center', 'Right'],
    alignments: ['left', 'center', 'right'],
    rows: [['L', 'C', 'R']],
  };

  const emptyData: TableData = {
    headers: ['A', 'B'],
    alignments: [null, null],
    rows: [],
  };

  it('should render table element', () => {
    const widget = new TableWidget(simpleData);
    const dom = widget.toDOM();

    expect(dom.tagName).toBe('DIV');
    expect(dom.className).toBe('cm-table-widget');

    const table = dom.querySelector('table');
    expect(table).not.toBeNull();
  });

  it('should render thead and tbody', () => {
    const widget = new TableWidget(simpleData);
    const dom = widget.toDOM();

    const thead = dom.querySelector('thead');
    const tbody = dom.querySelector('tbody');

    expect(thead).not.toBeNull();
    expect(tbody).not.toBeNull();

    const headerCells = thead?.querySelectorAll('th');
    expect(headerCells?.length).toBe(2);
    expect(headerCells?.[0].textContent).toBe('Name');
    expect(headerCells?.[1].textContent).toBe('Age');

    const rows = tbody?.querySelectorAll('tr');
    expect(rows?.length).toBe(2);
  });

  it('should apply alignment styles', () => {
    const widget = new TableWidget(alignedData);
    const dom = widget.toDOM();

    const headerCells = dom.querySelectorAll('th');
    expect(headerCells[0].style.textAlign).toBe('left');
    expect(headerCells[1].style.textAlign).toBe('center');
    expect(headerCells[2].style.textAlign).toBe('right');

    const dataCells = dom.querySelectorAll('td');
    expect(dataCells[0].style.textAlign).toBe('left');
    expect(dataCells[1].style.textAlign).toBe('center');
    expect(dataCells[2].style.textAlign).toBe('right');
  });

  it('should handle empty data (no rows)', () => {
    const widget = new TableWidget(emptyData);
    const dom = widget.toDOM();

    const tbody = dom.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');

    expect(rows?.length).toBe(0);
  });

  it('should compare equality correctly', () => {
    const widget1 = new TableWidget(simpleData);
    const widget2 = new TableWidget(simpleData);
    const widget3 = new TableWidget(alignedData);

    expect(widget1.eq(widget2)).toBe(true);
    expect(widget1.eq(widget3)).toBe(false);
  });

  it('should not ignore events (allow click to edit)', () => {
    const widget = new TableWidget(simpleData);
    expect(widget.ignoreEvent()).toBe(false);
  });

  it('should handle cells with special characters', () => {
    const data: TableData = {
      headers: ['Code'],
      alignments: [null],
      rows: [['<script>alert(1)</script>']],
    };

    const widget = new TableWidget(data);
    const dom = widget.toDOM();

    const cell = dom.querySelector('td');
    // Should be text content, not HTML
    expect(cell?.textContent).toBe('<script>alert(1)</script>');
    expect(cell?.innerHTML).not.toContain('<script>');
  });
});
