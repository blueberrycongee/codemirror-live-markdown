import { ViewUpdate } from '@codemirror/view';
import { mouseSelectingField } from './mouseSelecting';

/**
 * Update action for ViewPlugin
 * - 'rebuild': Decorations need to be rebuilt
 * - 'skip': Skip this update (e.g., during drag)
 * - 'none': No action needed
 */
export type UpdateAction = 'rebuild' | 'skip' | 'none';

/**
 * Determine what action a ViewPlugin should take on update
 *
 * This helper extracts the common update logic shared by livePreviewPlugin
 * and mathPlugin, handling:
 * 1. Document/viewport/config changes → rebuild
 * 2. Drag end → rebuild
 * 3. During drag → skip (avoid flickering)
 * 4. Selection change → rebuild
 *
 * @param update - The ViewUpdate from CodeMirror
 * @returns The action the plugin should take
 *
 * @example
 * ```typescript
 * update(update: ViewUpdate) {
 *   const action = checkUpdateAction(update);
 *   if (action === 'rebuild') {
 *     this.decorations = this.build(update.view);
 *   }
 * }
 * ```
 */
export function checkUpdateAction(update: ViewUpdate): UpdateAction {
  // Document/viewport/config changes: must rebuild
  if (
    update.docChanged ||
    update.viewportChanged ||
    update.transactions.some((t) => t.reconfigured)
  ) {
    return 'rebuild';
  }

  // Check drag state
  const isDragging = update.state.field(mouseSelectingField, false);
  const wasDragging = update.startState.field(mouseSelectingField, false);

  // Just finished dragging: rebuild
  if (wasDragging && !isDragging) {
    return 'rebuild';
  }

  // Currently dragging: skip to avoid flickering
  if (isDragging) {
    return 'skip';
  }

  // Selection changed: rebuild
  if (update.selectionSet) {
    return 'rebuild';
  }

  return 'none';
}
