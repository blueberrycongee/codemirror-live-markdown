import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { Table } from '@lezer/markdown';
import { tableField } from '../table';
import { mouseSelectingField } from '../../core/mouseSelecting';
import { collapseOnSelectionFacet } from '../../core/facets';

describe('tableField', () => {
  function createTestView(doc: string, cursorPos?: number) {
    const state = EditorState.create({
      doc,
      selection: cursorPos !== undefined ? { anchor: cursorPos } : undefined,
      extensions: [
        markdown({ extensions: [Table] }),
        mouseSelectingField,
        collapseOnSelectionFacet.of(true),
        tableField,
      ],
    });
    const container = document.createElement('div');
    return new EditorView({ state, parent: container });
  }

  const simpleTable = `| Name | Age |
|------|-----|
| Alice | 25 |`;

  const tableWithText = `Some text before

| Name | Age |
|------|-----|
| Alice | 25 |

Some text after`;

  it('should initialize without errors', () => {
    const view = createTestView(simpleTable);
    const decos = view.state.field(tableField);

    expect(decos).toBeDefined();

    view.destroy();
  });

  it('should handle empty document', () => {
    const view = createTestView('');
    const decos = view.state.field(tableField);

    expect(decos.size).toBe(0);

    view.destroy();
  });

  it('should handle document without table', () => {
    const view = createTestView('Just plain text\n\nNo tables here');
    const decos = view.state.field(tableField);

    expect(decos.size).toBe(0);

    view.destroy();
  });

  it('should detect table in document', () => {
    const view = createTestView(simpleTable);
    const decos = view.state.field(tableField);

    // 应该有装饰
    expect(decos.size).toBeGreaterThan(0);

    view.destroy();
  });

  it('should show widget when cursor outside table', () => {
    // 光标在表格之后
    const view = createTestView(tableWithText, tableWithText.length);
    const decos = view.state.field(tableField);

    let hasWidget = false;
    decos.between(0, view.state.doc.length, (_from, _to, deco) => {
      const spec = deco.spec as { widget?: unknown };
      if (spec.widget) {
        hasWidget = true;
      }
    });

    expect(hasWidget).toBe(true);

    view.destroy();
  });

  it('should show source when cursor inside table', () => {
    // 光标在表格内部（第一行）
    const view = createTestView(simpleTable, 5);
    const decos = view.state.field(tableField);

    let hasSourceClass = false;
    decos.between(0, view.state.doc.length, (_from, _to, deco) => {
      const spec = deco.spec as { class?: string };
      if (spec.class?.includes('cm-table-source')) {
        hasSourceClass = true;
      }
    });

    expect(hasSourceClass).toBe(true);

    view.destroy();
  });

  it('should update on document change', () => {
    const view = createTestView('plain text');

    view.dispatch({
      changes: { from: 0, to: 10, insert: simpleTable },
    });

    const decos = view.state.field(tableField);
    expect(decos.size).toBeGreaterThan(0);

    view.destroy();
  });

  it('should update on selection change', () => {
    // 光标初始在表格外
    const view = createTestView(tableWithText, tableWithText.length);

    // 移动光标到表格内部
    view.dispatch({
      selection: { anchor: 20 },
    });

    const decos = view.state.field(tableField);
    expect(decos).toBeDefined();

    view.destroy();
  });

  it('should handle multiple tables', () => {
    const doc = `${simpleTable}

Some text in between the tables

| A | B |
|---|---|
| 1 | 2 |

More text after`;

    // 光标在中间文本处，不触及任何表格
    const view = createTestView(doc, 50);
    const decos = view.state.field(tableField);

    // 应该有多个装饰（两个表格）
    let widgetCount = 0;
    decos.between(0, view.state.doc.length, (_from, _to, deco) => {
      const spec = deco.spec as { widget?: unknown };
      if (spec.widget) {
        widgetCount++;
      }
    });

    expect(widgetCount).toBe(2);

    view.destroy();
  });

  it('should handle invalid table syntax', () => {
    // 无效表格（没有分隔行）
    const invalidTable = `| A | B |
| 1 | 2 |`;

    const view = createTestView(invalidTable);
    const decos = view.state.field(tableField);

    // 无效表格不应该有装饰
    let hasTableDeco = false;
    decos.between(0, view.state.doc.length, (_from, _to, deco) => {
      const spec = deco.spec as { widget?: unknown; class?: string };
      if (spec.widget || spec.class?.includes('cm-table')) {
        hasTableDeco = true;
      }
    });

    expect(hasTableDeco).toBe(false);

    view.destroy();
  });

  it('should handle table with alignment', () => {
    const alignedTable = `| Left | Center | Right |
|:-----|:------:|------:|
| L | C | R |`;

    const view = createTestView(alignedTable, alignedTable.length);
    const decos = view.state.field(tableField);

    expect(decos.size).toBeGreaterThan(0);

    view.destroy();
  });
});
