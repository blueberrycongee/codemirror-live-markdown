import { EditorState } from '@codemirror/state';
import { collapseOnSelectionFacet } from './facets';
import { mouseSelectingField } from './mouseSelecting';

/**
 * Determine whether the specified range should show source code
 *
 * This is the core decision function for Live Preview, determining whether
 * an element should display source code or rendered output.
 *
 * @param state - Editor state
 * @param from - Element start position
 * @param to - Element end position
 * @returns true = show source, false = show rendered output
 *
 * @example
 * ```typescript
 * // Document content: "Hello **world** test"
 * // Positions:         0     6    13   18
 *
 * // Case 1: Cursor after "Hello" (position 5)
 * shouldShowSource(state, 6, 15) // false - hide **, show bold effect
 *
 * // Case 2: Cursor in middle of "world" (position 10)
 * shouldShowSource(state, 6, 15) // true - show **, editable
 *
 * // Case 3: Selection spans across (positions 4-12)
 * shouldShowSource(state, 6, 15) // true - show **, editable
 * ```
 */
export const shouldShowSource = (state: EditorState, from: number, to: number): boolean => {
  // 1. Check if Live Preview is enabled
  const shouldCollapse = state.facet(collapseOnSelectionFacet);
  if (!shouldCollapse) {
    return false; // Not enabled, always show source
  }

  // 2. Don't show source during drag selection (avoid flickering)
  const isDragging = state.field(mouseSelectingField, false);
  if (isDragging) {
    return false;
  }

  // 3. Check if cursor touches the target range
  for (const range of state.selection.ranges) {
    // Show source if there's any intersection
    if (range.from <= to && range.to >= from) {
      return true;
    }
  }

  return false; // No intersection, show rendered output
};
