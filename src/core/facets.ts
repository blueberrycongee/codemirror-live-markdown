import { Facet } from '@codemirror/state';

/**
 * Facet: 控制是否启用 Live Preview 模式
 * - true: 启用 Live Preview（非活动行隐藏标记）
 * - false: 源码模式（显示所有标记）
 */
export const collapseOnSelectionFacet = Facet.define<boolean, boolean>({
  combine: (values) => values[0] ?? false,
});
