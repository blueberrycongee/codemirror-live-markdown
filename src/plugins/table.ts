/**
 * 表格插件
 *
 * 实现 Markdown 表格的实时预览：
 * - 光标不在表格内 → 渲染为 HTML 表格
 * - 光标进入表格 → 显示源码，可直接编辑
 *
 * 使用 StateField 因为 block decorations 必须通过 StateField 提供
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import { parseMarkdownTable } from '../utils/tableParser';
import { createTableWidget } from '../widgets/tableWidget';

/**
 * 构建表格装饰
 */
function buildTableDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const isDrag = state.field(mouseSelectingField, false);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Table') {
        const tableSource = state.doc.sliceString(node.from, node.to);
        const tableData = parseMarkdownTable(tableSource);

        // 无效表格不渲染
        if (!tableData) return;

        const isTouched = shouldShowSource(state, node.from, node.to);

        if (!isTouched && !isDrag) {
          // 渲染模式：显示 HTML 表格
          const widget = createTableWidget(tableData);
          decorations.push(
            Decoration.replace({ widget, block: true }).range(node.from, node.to)
          );
        } else {
          // 编辑模式：为表格每行添加背景色
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
 * 表格 StateField
 *
 * 管理表格的装饰状态
 */
export const tableField = StateField.define<DecorationSet>({
  create(state) {
    return buildTableDecorations(state);
  },

  update(deco, tr) {
    // 文档变化或重新配置时重建
    if (tr.docChanged || tr.reconfigured) {
      return buildTableDecorations(tr.state);
    }

    // 拖拽状态变化时重建
    const isDragging = tr.state.field(mouseSelectingField, false);
    const wasDragging = tr.startState.field(mouseSelectingField, false);

    if (wasDragging && !isDragging) {
      return buildTableDecorations(tr.state);
    }

    // 拖拽中保持不变
    if (isDragging) {
      return deco;
    }

    // 选区变化时重建
    if (tr.selection) {
      return buildTableDecorations(tr.state);
    }

    return deco;
  },

  provide: (f) => EditorView.decorations.from(f),
});
