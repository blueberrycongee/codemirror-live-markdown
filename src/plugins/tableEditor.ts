/**
 * Editable Table Plugin
 *
 * Advanced Live Preview for Markdown tables:
 * - Always render table in Live mode
 * - Toggle source mode via explicit button
 * - Editable headers and cells in Live mode
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Extension, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { parseMarkdownTable } from '../utils/tableParser';
import {
  createTableEditorWidget,
  createTableSourceToggleWidget,
} from '../widgets/tableEditorWidget';
import { setTableSourceMode, TableSourceModeToggle } from './tableEditorEffects';

interface TableSourceRange {
  from: number;
  to: number;
}

function rangesOverlap(a: TableSourceRange, b: TableSourceRange): boolean {
  return a.from <= b.to && a.to >= b.from;
}

function removeRange(ranges: TableSourceRange[], target: TableSourceRange): TableSourceRange[] {
  return ranges.filter((range) => !rangesOverlap(range, target));
}

function addRange(ranges: TableSourceRange[], next: TableSourceRange): TableSourceRange[] {
  if (ranges.some((range) => rangesOverlap(range, next))) {
    return ranges;
  }
  return [...ranges, next];
}

function isTableInSourceMode(
  ranges: TableSourceRange[],
  from: number,
  to: number
): boolean {
  return ranges.some((range) => range.from <= to && range.to >= from);
}

const tableSourceModeField = StateField.define<TableSourceRange[]>({
  create: () => [],
  update(ranges, tr) {
    let next = ranges.map((range) => ({
      from: tr.changes.mapPos(range.from, 1),
      to: tr.changes.mapPos(range.to, -1),
    }));

    for (const effect of tr.effects) {
      if (!effect.is(setTableSourceMode)) continue;
      const { from, to, showSource } = effect.value as TableSourceModeToggle;
      const mapped = {
        from: tr.changes.mapPos(from, 1),
        to: tr.changes.mapPos(to, -1),
      };
      next = showSource ? addRange(next, mapped) : removeRange(next, mapped);
    }

    return next;
  },
});

function buildTableDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const sourceRanges = state.field(tableSourceModeField);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'Table') return;

      const tableSource = state.doc.sliceString(node.from, node.to);
      const tableData = parseMarkdownTable(tableSource);

      if (!tableData) return;

      const showSource = isTableInSourceMode(sourceRanges, node.from, node.to);

      if (!showSource) {
        const widget = createTableEditorWidget(tableData, node.from, node.to);
        decorations.push(
          Decoration.replace({ widget, block: true }).range(node.from, node.to)
        );
        return;
      }

      const toggleWidget = createTableSourceToggleWidget(node.from, node.to);
      decorations.push(
        Decoration.widget({ widget: toggleWidget, block: true }).range(node.from)
      );

      for (let pos = node.from; pos <= node.to; ) {
        const line = state.doc.lineAt(pos);
        decorations.push(
          Decoration.line({ class: 'cm-table-source' }).range(line.from)
        );
        pos = line.to + 1;
      }
    },
  });

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

export const tableEditorField = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecorations(state);
  },

  update(deco, tr) {
    if (
      tr.docChanged ||
      tr.reconfigured ||
      tr.effects.some((effect) => effect.is(setTableSourceMode))
    ) {
      return buildTableDecorations(tr.state);
    }

    return deco;
  },

  provide: (f) => EditorView.decorations.from(f),
});

export function tableEditorPlugin(): Extension {
  return [tableSourceModeField, tableEditorField];
}

export { setTableSourceMode };
