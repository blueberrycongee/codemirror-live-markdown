import { StateEffect, StateField } from '@codemirror/state';

/**
 * Effect: 设置拖拽选择状态
 */
export const setMouseSelecting = StateEffect.define<boolean>();

/**
 * StateField: 跟踪拖拽选择状态
 * 用于在拖拽选择时避免频繁重建装饰，防止闪烁和性能问题
 */
export const mouseSelectingField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setMouseSelecting)) {
        return effect.value;
      }
    }
    return value;
  },
});
