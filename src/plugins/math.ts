/**
 * Math Formula Plugin
 *
 * Supports inline formulas (`$...$`) and block formulas (```math ... ```)
 * Uses KaTeX for rendering, supports edit mode switching
 *
 * How it works:
 * 1. Traverse syntax tree to find math formula nodes
 * 2. Decide whether to show rendered result or source based on cursor position
 * 3. Use Widget for rendering, use Mark decoration for edit mode
 *
 * Note:
 * - Inline formulas use ViewPlugin (Decoration.replace without block)
 * - Block formulas use StateField (block decorations must be provided via StateField)
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
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
import { createMathWidget } from '../widgets/mathWidget';

/**
 * Inline math formula ViewPlugin
 *
 * Handles `$...$` format inline formulas
 */
export const mathPlugin = ViewPlugin.fromClass(
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

    build(view: EditorView): DecorationSet {
      const decorations: Range<Decoration>[] = [];
      const { state } = view;
      const isDrag = state.field(mouseSelectingField, false);

      syntaxTree(state).iterate({
        enter: (node) => {
          // Only handle inline formulas
          if (node.name === 'InlineCode') {
            const fullText = state.doc.sliceString(node.from, node.to);

            if (
              fullText.startsWith('`$') &&
              fullText.endsWith('$`') &&
              fullText.length > 4
            ) {
              const source = fullText.slice(2, -2);
              const isTouched = shouldShowSource(state, node.from, node.to);

              if (!isTouched && !isDrag) {
                const widget = createMathWidget(source, false);
                decorations.push(
                  Decoration.replace({ widget }).range(node.from, node.to)
                );
              } else {
                decorations.push(
                  Decoration.mark({ class: 'cm-math-source' }).range(
                    node.from,
                    node.to
                  )
                );
              }
            }
          }
        },
      });

      return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * Build block math formula decorations
 */
function buildBlockMathDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const isDrag = state.field(mouseSelectingField, false);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'FencedCode') {
        const codeInfo = node.node.getChild('CodeInfo');
        if (codeInfo) {
          const lang = state.doc.sliceString(codeInfo.from, codeInfo.to);

          if (lang === 'math') {
            const codeText = node.node.getChild('CodeText');
            const source = codeText
              ? state.doc.sliceString(codeText.from, codeText.to).trim()
              : '';
            const isTouched = shouldShowSource(state, node.from, node.to);

            if (!isTouched && !isDrag) {
              // Show rendered result
              const widget = createMathWidget(source, true);
              decorations.push(
                Decoration.replace({ widget, block: true }).range(
                  node.from,
                  node.to
                )
              );
            } else {
              // Edit mode: add background to each line
              for (let pos = node.from; pos <= node.to; ) {
                const line = state.doc.lineAt(pos);
                decorations.push(
                  Decoration.line({ class: 'cm-math-source-block' }).range(
                    line.from
                  )
                );
                pos = line.to + 1;
              }
            }
          }
        }
      }
    },
  });

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

/**
 * Block math formula StateField
 *
 * Handles ```math ... ``` format block formulas
 * Must use StateField because block decorations cannot be provided via ViewPlugin
 */
export const blockMathField = StateField.define<DecorationSet>({
  create(state) {
    return buildBlockMathDecorations(state);
  },

  update(deco, tr) {
    if (tr.docChanged || tr.reconfigured) {
      return buildBlockMathDecorations(tr.state);
    }

    const isDragging = tr.state.field(mouseSelectingField, false);
    const wasDragging = tr.startState.field(mouseSelectingField, false);

    if (wasDragging && !isDragging) {
      return buildBlockMathDecorations(tr.state);
    }

    if (isDragging) {
      return deco;
    }

    if (tr.selection) {
      return buildBlockMathDecorations(tr.state);
    }

    return deco;
  },

  provide: (f) => EditorView.decorations.from(f),
});
