import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import { checkUpdateAction } from '../core/pluginUpdateHelper';

/**
 * Parent node types to skip
 * Marks inside these nodes should not be processed
 */
const SKIP_PARENT_TYPES = new Set(['FencedCode', 'CodeBlock']);

/**
 * Check if node is inside a skipped parent
 */
function isInsideSkippedParent(node: {
  node: { parent: { name: string; parent: unknown } | null };
}): boolean {
  let parent = node.node.parent;
  while (parent) {
    if (SKIP_PARENT_TYPES.has(parent.name)) {
      return true;
    }
    parent = parent.parent as { name: string; parent: unknown } | null;
  }
  return false;
}

/**
 * Live Preview Plugin
 *
 * Handles animated show/hide of inline marks (bold, italic, strikethrough, etc.)
 * and block marks (headings, lists, quotes)
 *
 * How it works:
 * 1. Traverse syntax tree to find all mark nodes
 * 2. Decide whether to show marks based on cursor position
 * 3. Apply CSS classes to trigger animations
 */
export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      if (checkUpdateAction(update) === 'rebuild') {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView) {
      const decorations: Range<Decoration>[] = [];
      const { state } = view;

      // Get all active lines
      const activeLines = new Set<number>();
      for (const range of state.selection.ranges) {
        const startLine = state.doc.lineAt(range.from).number;
        const endLine = state.doc.lineAt(range.to).number;
        for (let l = startLine; l <= endLine; l++) {
          activeLines.add(l);
        }
      }

      const isDrag = state.field(mouseSelectingField, false);

      // Traverse syntax tree
      syntaxTree(state).iterate({
        enter: (node) => {
          // Only handle mark nodes
          const markTypes = [
            'EmphasisMark', // * or _
            'StrikethroughMark', // ~~
            'CodeMark', // `
            'HeaderMark', // #
            'ListMark', // - or *
            'QuoteMark', // >
          ];

          if (!markTypes.includes(node.name)) return;

          // Skip marks inside code blocks
          if (isInsideSkippedParent(node)) {
            return;
          }

          // Skip CodeMark for math formulas (handled by mathPlugin)
          if (node.name === 'CodeMark') {
            const parent = node.node.parent;
            if (parent && parent.name === 'InlineCode') {
              const text = state.doc.sliceString(parent.from, parent.to);
              // If it's math formula format `$...$`, skip
              if (text.startsWith('`$') && text.endsWith('$`')) {
                return;
              }
            }
          }

          const isBlock = ['HeaderMark', 'ListMark', 'QuoteMark'].includes(
            node.name
          );
          const lineNum = state.doc.lineAt(node.from).number;
          const isActiveLine = activeLines.has(lineNum);

          if (isBlock) {
            // Block marks: use fontSize animation
            const cls =
              isActiveLine && !isDrag
                ? 'cm-formatting-block cm-formatting-block-visible'
                : 'cm-formatting-block';
            decorations.push(
              Decoration.mark({ class: cls }).range(node.from, node.to)
            );
          } else {
            // Inline marks: use max-width animation
            if (node.from >= node.to) return;

            const isTouched = shouldShowSource(state, node.from, node.to);
            const cls =
              isTouched && !isDrag
                ? 'cm-formatting-inline cm-formatting-inline-visible'
                : 'cm-formatting-inline';

            decorations.push(
              Decoration.mark({ class: cls }).range(node.from, node.to)
            );
          }
        },
      });

      return Decoration.set(
        decorations.sort((a, b) => a.from - b.from),
        true
      );
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
