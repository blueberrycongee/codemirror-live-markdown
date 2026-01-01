import { EditorState } from '@codemirror/state';
import { collapseOnSelectionFacet } from './facets';
import { mouseSelectingField } from './mouseSelecting';

/**
 * 判断指定范围是否应该显示源码
 * 
 * 这是整个 Live Preview 的核心判断函数，决定某个元素应该显示源码还是渲染效果。
 * 
 * @param state - 编辑器状态
 * @param from - 元素起始位置
 * @param to - 元素结束位置
 * @returns true = 显示源码, false = 显示渲染效果
 * 
 * @example
 * ```typescript
 * // 文档内容: "Hello **world** test"
 * // 位置:      0     6    13   18
 * 
 * // 场景 1: 光标在 "Hello" 后面 (位置 5)
 * shouldShowSource(state, 6, 15) // false - 隐藏 **, 显示粗体效果
 * 
 * // 场景 2: 光标在 "world" 中间 (位置 10)
 * shouldShowSource(state, 6, 15) // true - 显示 **, 可以编辑
 * 
 * // 场景 3: 选区跨越 (位置 4-12)
 * shouldShowSource(state, 6, 15) // true - 显示 **, 可以编辑
 * ```
 */
export const shouldShowSource = (state: EditorState, from: number, to: number): boolean => {
  // 1. 检查是否启用 Live Preview
  const shouldCollapse = state.facet(collapseOnSelectionFacet);
  if (!shouldCollapse) {
    return false; // 未启用，始终显示源码
  }

  // 2. 拖拽选择时不显示源码（避免闪烁）
  const isDragging = state.field(mouseSelectingField, false);
  if (isDragging) {
    return false;
  }

  // 3. 检查光标是否接触目标区域
  for (const range of state.selection.ranges) {
    // 只要有交集就显示源码
    if (range.from <= to && range.to >= from) {
      return true;
    }
  }

  return false; // 无交集，显示渲染效果
};
