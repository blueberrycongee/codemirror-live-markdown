import { StateEffect, StateField } from '@codemirror/state';

/**
 * Effect: Set drag selection state
 */
export const setMouseSelecting = StateEffect.define<boolean>();

/**
 * StateField: Track drag selection state
 * Used to avoid frequent decoration rebuilds during drag selection,
 * preventing flickering and performance issues
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
