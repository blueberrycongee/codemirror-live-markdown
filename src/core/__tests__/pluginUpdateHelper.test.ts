import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { checkUpdateAction, UpdateAction } from '../pluginUpdateHelper';
import { mouseSelectingField, setMouseSelecting } from '../mouseSelecting';

/**
 * Create a test plugin that captures ViewUpdate
 */
function createCapturePlugin() {
  let capturedUpdate: ViewUpdate | null = null;
  let capturedAction: UpdateAction | null = null;

  const plugin = ViewPlugin.fromClass(
    class {
      update(update: ViewUpdate) {
        capturedUpdate = update;
        capturedAction = checkUpdateAction(update);
      }
    }
  );

  return {
    plugin,
    getUpdate: () => capturedUpdate,
    getAction: () => capturedAction,
  };
}

/**
 * Create a test EditorView with capture plugin
 */
function createTestView(doc: string) {
  const capture = createCapturePlugin();

  const state = EditorState.create({
    doc,
    extensions: [mouseSelectingField, capture.plugin],
  });

  const container = document.createElement('div');
  const view = new EditorView({ state, parent: container });

  return { view, capture };
}

describe('checkUpdateAction', () => {
  describe('rebuild scenarios', () => {
    it('should return "rebuild" when document changed (docChanged: true)', () => {
      const { view, capture } = createTestView('initial text');

      // Dispatch a document change
      view.dispatch({
        changes: { from: 0, to: 12, insert: 'modified text' },
      });

      const action = capture.getAction();
      expect(action).toBe('rebuild');

      view.destroy();
    });

    it('should return "rebuild" when drag ends (wasDragging: true, isDragging: false)', () => {
      const { view, capture } = createTestView('test');

      // Start dragging
      view.dispatch({
        effects: setMouseSelecting.of(true),
      });

      // End dragging - this should trigger rebuild
      view.dispatch({
        effects: setMouseSelecting.of(false),
      });

      const action = capture.getAction();
      expect(action).toBe('rebuild');

      view.destroy();
    });

    it('should return "rebuild" when selection changed', () => {
      const { view, capture } = createTestView('test text');

      // Change selection
      view.dispatch({
        selection: { anchor: 5 },
      });

      const action = capture.getAction();
      expect(action).toBe('rebuild');

      view.destroy();
    });
  });

  describe('skip scenario', () => {
    it('should return "skip" when currently dragging (isDragging: true)', () => {
      const { view, capture } = createTestView('test');

      // Start dragging
      view.dispatch({
        effects: setMouseSelecting.of(true),
      });

      // Make another change while dragging (but not ending drag)
      view.dispatch({
        selection: { anchor: 2 },
      });

      const action = capture.getAction();
      expect(action).toBe('skip');

      view.destroy();
    });
  });

  describe('none scenario', () => {
    it('should return "none" when no relevant changes occurred', () => {
      const { view, capture } = createTestView('test');

      // Dispatch an empty transaction (no changes)
      view.dispatch({});

      const action = capture.getAction();
      expect(action).toBe('none');

      view.destroy();
    });
  });
});
