/**
 * Table Plugin
 *
 * Implements live preview for Markdown tables:
 * - Cursor outside table → render as HTML table
 * - Cursor inside table → show source, editable
 *
 * Uses StateField because block decorations must be provided via StateField
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import { parseMarkdownTable } from '../utils/tableParser';
import { createTableWidget } from '../widgets/tableWidget';

/**
 * Build table decorations
 */
function buildTableDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const isDrag = state.field(mouseSelectingField, false);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Table') {
        const tableSource = state.doc.sliceString(node.from, node.to);
        const tableData = parseMarkdownTable(tableSource);

        // Don't render invalid tables
        if (!tableData) return;

        const isTouched = shouldShowSource(state, node.from, node.to);

        if (!isTouched && !isDrag) {
          // Render mode: show HTML table
          const widget = createTableWidget(tableData);
          decorations.push(
            Decoration.replace({ widget, block: true }).range(node.from, node.to)
          );
        } else {
          // Edit mode: add background to each table line
          for (let pos = node.from; pos <= node.to; ) {
            const line = state.doc.lineAt(pos);
            decorations.push(
              Decoration.line({ class: 'cm-table-source' }).range(line.from)
            );
            pos = line.to + 1;
          }
        }
      }
    },
  });

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

/**
 * Table StateField
 *
 * Manages table decoration state
 */
export const tableField = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecorations(state);
  },

  update(deco, tr) {
    // Rebuild on document or config change
    if (tr.docChanged || tr.reconfigured) {
      return buildTableDecorations(tr.state);
    }

    // Rebuild on drag state change
    const isDragging = tr.state.field(mouseSelectingField, false);
    const wasDragging = tr.startState.field(mouseSelectingField, false);

    if (wasDragging && !isDragging) {
      return buildTableDecorations(tr.state);
    }

    // Keep unchanged during drag
    if (isDragging) {
      return deco;
    }

    // Rebuild on selection change
    if (tr.selection) {
      return buildTableDecorations(tr.state);
    }

    return deco;
  },

  provide: (f) => EditorView.decorations.from(f),
});
