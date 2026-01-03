/**
 * 数学公式插件
 *
 * 支持行内公式 (`$...$`) 和块级公式 (```math ... ```)
 * 使用 KaTeX 渲染，支持编辑模式切换
 *
 * 工作原理：
 * 1. 遍历语法树，找到数学公式节点
 * 2. 根据光标位置决定显示渲染结果还是源码
 * 3. 使用 Widget 渲染公式，使用 Mark 装饰编辑模式
 *
 * 注意：
 * - 行内公式使用 ViewPlugin（Decoration.replace 不带 block）
 * - 块级公式使用 StateField（block decorations 必须通过 StateField 提供）
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import { createMathWidget } from '../widgets/mathWidget';

/**
 * 行内数学公式 ViewPlugin
 *
 * 处理 `$...$` 格式的行内公式
 */
export const mathPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.transactions.some((t) => t.reconfigured)
      ) {
        this.decorations = this.build(update.view);
        return;
      }

      const isDragging = update.state.field(mouseSelectingField, false);
      const wasDragging = update.startState.field(mouseSelectingField, false);

      if (wasDragging && !isDragging) {
        this.decorations = this.build(update.view);
        return;
      }

      if (isDragging) return;

      if (update.selectionSet) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView): DecorationSet {
      const decorations: Range<Decoration>[] = [];
      const { state } = view;
      const isDrag = state.field(mouseSelectingField, false);

      syntaxTree(state).iterate({
        enter: (node) => {
          // 只处理行内公式
          if (node.name === 'InlineCode') {
            const fullText = state.doc.sliceString(node.from, node.to);

            if (fullText.startsWith('`$') && fullText.endsWith('$`') && fullText.length > 4) {
              const source = fullText.slice(2, -2);
              const isTouched = shouldShowSource(state, node.from, node.to);

              if (!isTouched && !isDrag) {
                const widget = createMathWidget(source, false);
                decorations.push(Decoration.replace({ widget }).range(node.from, node.to));
              } else {
                decorations.push(
                  Decoration.mark({ class: 'cm-math-source' }).range(node.from, node.to)
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
 * 构建块级数学公式装饰
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
            const source = codeText ? state.doc.sliceString(codeText.from, codeText.to).trim() : '';
            const isTouched = shouldShowSource(state, node.from, node.to);

            if (!isTouched && !isDrag) {
              // 显示渲染结果
              const widget = createMathWidget(source, true);
              decorations.push(
                Decoration.replace({ widget, block: true }).range(node.from, node.to)
              );
            } else {
              // 编辑模式：为每一行添加背景色
              for (let pos = node.from; pos <= node.to; ) {
                const line = state.doc.lineAt(pos);
                decorations.push(Decoration.line({ class: 'cm-math-source-block' }).range(line.from));
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
 * 块级数学公式 StateField
 *
 * 处理 ```math ... ``` 格式的块级公式
 * 必须使用 StateField 因为 block decorations 不能通过 ViewPlugin 提供
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
