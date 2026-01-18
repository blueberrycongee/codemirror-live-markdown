import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { Table } from '@lezer/markdown';
import { syntaxTree } from '@codemirror/language';
import { tableEditorField, setTableSourceMode, tableEditorPlugin } from '../tableEditor';

describe('tableEditorPlugin', () => {
  function createTestView(doc: string, cursorPos?: number) {
    const state = EditorState.create({
      doc,
      selection: cursorPos !== undefined ? { anchor: cursorPos } : undefined,
      extensions: [markdown({ extensions: [Table] }), tableEditorPlugin()],
    });
    const container = document.createElement('div');
    return new EditorView({ state, parent: container });
  }

  const simpleTable = `| Name | Age |
|------|-----|
| Alice | 25 |`;

  it('should keep table widget rendered when cursor is inside table', () => {
    const view = createTestView(simpleTable, 5);
    const decos = view.state.field(tableEditorField);

    let hasWidget = false;
    let hasSourceClass = false;
    decos.between(0, view.state.doc.length, (_from, _to, deco) => {
      const spec = deco.spec as { widget?: unknown; class?: string };
      if (spec.widget) hasWidget = true;
      if (spec.class?.includes('cm-table-source')) hasSourceClass = true;
    });

    expect(hasWidget).toBe(true);
    expect(hasSourceClass).toBe(false);

    view.destroy();
  });

  it('should toggle to source mode via effect', () => {
    const view = createTestView(simpleTable);
    const tree = syntaxTree(view.state);
    let from = 0;
    let to = view.state.doc.length;

    tree.iterate({
      enter: (node) => {
        if (node.name === 'Table') {
          from = node.from;
          to = node.to;
        }
      },
    });

    view.dispatch({
      effects: setTableSourceMode.of({ from, to, showSource: true }),
    });

    const decos = view.state.field(tableEditorField);
    let hasSourceClass = false;
    let hasWidget = false;
    decos.between(0, view.state.doc.length, (_from, _to, deco) => {
      const spec = deco.spec as { widget?: unknown; class?: string };
      if (spec.class?.includes('cm-table-source')) hasSourceClass = true;
      if (spec.widget) hasWidget = true;
    });

    expect(hasSourceClass).toBe(true);
    expect(hasWidget).toBe(true);

    view.destroy();
  });

  it('should update markdown when editing a cell', () => {
    const view = createTestView(simpleTable);
    const cell = view.dom.querySelector('.cm-table-editor td') as HTMLElement | null;

    expect(cell).not.toBeNull();
    if (!cell) {
      view.destroy();
      return;
    }

    cell.textContent = 'Bob';
    cell.dispatchEvent(new Event('blur'));

    expect(view.state.doc.toString()).toBe(
      `| Name | Age |
| --- | --- |
| Bob | 25 |`
    );

    view.destroy();
  });
});
