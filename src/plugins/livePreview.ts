import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';

/**
 * Live Preview 插件
 * 
 * 负责处理行内标记（加粗、斜体、删除线等）和块级标记（标题、列表、引用）的动画显示/隐藏
 * 
 * 工作原理：
 * 1. 遍历语法树，找到所有标记节点
 * 2. 根据光标位置决定是否显示标记
 * 3. 应用 CSS 类触发动画
 */
export const livePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      // 文档变化或视口变化：必须重建
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.transactions.some((t) => t.reconfigured)
      ) {
        this.decorations = this.build(update.view);
        return;
      }

      // 拖动状态变化
      const isDragging = update.state.field(mouseSelectingField, false);
      const wasDragging = update.startState.field(mouseSelectingField, false);

      // 刚结束拖动：重建
      if (wasDragging && !isDragging) {
        this.decorations = this.build(update.view);
        return;
      }

      // 正在拖动：跳过
      if (isDragging) return;

      // 普通选择变化：重建
      if (update.selectionSet) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView) {
      const decorations: Range<Decoration>[] = [];
      const { state } = view;

      // 获取所有活动行
      const activeLines = new Set<number>();
      for (const range of state.selection.ranges) {
        const startLine = state.doc.lineAt(range.from).number;
        const endLine = state.doc.lineAt(range.to).number;
        for (let l = startLine; l <= endLine; l++) {
          activeLines.add(l);
        }
      }

      const isDrag = state.field(mouseSelectingField, false);

      // 遍历语法树
      syntaxTree(state).iterate({
        enter: (node) => {
          // 只处理标记节点
          const markTypes = [
            'EmphasisMark', // * 或 _
            'StrikethroughMark', // ~~
            'CodeMark', // `
            'HeaderMark', // #
            'ListMark', // - 或 *
            'QuoteMark', // >
          ];

          if (!markTypes.includes(node.name)) return;

          // 跳过数学公式的 CodeMark（由 mathPlugin 处理）
          if (node.name === 'CodeMark') {
            const parent = node.node.parent;
            if (parent && parent.name === 'InlineCode') {
              const text = state.doc.sliceString(parent.from, parent.to);
              // 如果是数学公式格式 `$...$`，跳过
              if (text.startsWith('`$') && text.endsWith('$`')) {
                return;
              }
            }
          }

          const isBlock = ['HeaderMark', 'ListMark', 'QuoteMark'].includes(node.name);
          const lineNum = state.doc.lineAt(node.from).number;
          const isActiveLine = activeLines.has(lineNum);

          if (isBlock) {
            // 块级标记：使用 fontSize 动画
            const cls =
              isActiveLine && !isDrag
                ? 'cm-formatting-block cm-formatting-block-visible'
                : 'cm-formatting-block';
            decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));
          } else {
            // 行内标记：使用 max-width 动画
            if (node.from >= node.to) return;

            const isTouched = shouldShowSource(state, node.from, node.to);
            const cls =
              isTouched && !isDrag
                ? 'cm-formatting-inline cm-formatting-inline-visible'
                : 'cm-formatting-inline';

            decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));
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
