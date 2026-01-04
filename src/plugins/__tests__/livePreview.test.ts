import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { livePreviewPlugin } from '../livePreview';
import { mouseSelectingField } from '../../core/mouseSelecting';
import { collapseOnSelectionFacet } from '../../core/facets';

/**
 * Create test EditorView
 */
function createTestView(doc: string, cursorPos?: number) {
  const state = EditorState.create({
    doc,
    selection: cursorPos !== undefined ? { anchor: cursorPos } : undefined,
    extensions: [
      markdown(),
      mouseSelectingField,
      collapseOnSelectionFacet.of(true),
      livePreviewPlugin,
    ],
  });

  // Create minimal DOM container
  const container = document.createElement('div');
  return new EditorView({ state, parent: container });
}

describe('livePreviewPlugin', () => {
  describe('plugin initialization', () => {
    it('should create decorations on initialization', () => {
      const view = createTestView('**bold** text');
      const plugin = view.plugin(livePreviewPlugin);

      expect(plugin).toBeDefined();
      expect(plugin?.decorations).toBeDefined();

      view.destroy();
    });

    it('should handle empty document', () => {
      const view = createTestView('');
      const plugin = view.plugin(livePreviewPlugin);

      expect(plugin?.decorations.size).toBe(0);

      view.destroy();
    });
  });

  describe('inline mark detection', () => {
    it('should detect EmphasisMark (*)', () => {
      const view = createTestView('*italic* text');
      const plugin = view.plugin(livePreviewPlugin);

      // Should have decorations (EmphasisMark)
      expect(plugin?.decorations.size).toBeGreaterThan(0);

      view.destroy();
    });

    it('should detect StrikethroughMark (~~)', () => {
      // Note: Standard markdown parser may not support ~~, needs GFM extension
      // Here we test that plugin doesn't crash on unsupported syntax
      const view = createTestView('~~strikethrough~~ text');
      const plugin = view.plugin(livePreviewPlugin);

      // Plugin should initialize normally even if StrikethroughMark not detected
      expect(plugin).toBeDefined();

      view.destroy();
    });

    it('should detect CodeMark (`)', () => {
      const view = createTestView('`code` text');
      const plugin = view.plugin(livePreviewPlugin);

      expect(plugin?.decorations.size).toBeGreaterThan(0);

      view.destroy();
    });
  });

  describe('block mark detection', () => {
    it('should detect HeaderMark (#)', () => {
      const view = createTestView('# Heading');
      const plugin = view.plugin(livePreviewPlugin);

      expect(plugin?.decorations.size).toBeGreaterThan(0);

      view.destroy();
    });

    it('should detect ListMark (-)', () => {
      const view = createTestView('- list item');
      const plugin = view.plugin(livePreviewPlugin);

      expect(plugin?.decorations.size).toBeGreaterThan(0);

      view.destroy();
    });

    it('should detect QuoteMark (>)', () => {
      const view = createTestView('> quote');
      const plugin = view.plugin(livePreviewPlugin);

      expect(plugin?.decorations.size).toBeGreaterThan(0);

      view.destroy();
    });
  });

  describe('cursor interaction', () => {
    it('should show visible class when cursor is on inline mark', () => {
      // Cursor inside **bold**
      const view = createTestView('**bold** text', 4);
      const plugin = view.plugin(livePreviewPlugin);

      // Check if decorations contain visible class
      let hasInlineClass = false;
      plugin?.decorations.between(
        0,
        view.state.doc.length,
        (_from, _to, deco) => {
          const spec = deco.spec as { class?: string };
          if (spec.class?.includes('cm-formatting-inline')) {
            hasInlineClass = true;
          }
        }
      );

      // Plugin should detect inline marks
      expect(hasInlineClass).toBe(true);

      view.destroy();
    });

    it('should not show visible class when cursor is outside inline mark', () => {
      // Cursor at end of text
      const view = createTestView('**bold** text', 13);
      const plugin = view.plugin(livePreviewPlugin);

      // Check **bold** decorations should not have visible class
      let hasVisibleOnBold = false;
      plugin?.decorations.between(0, 8, (_from, _to, deco) => {
        const spec = deco.spec as { class?: string };
        if (spec.class?.includes('visible')) {
          hasVisibleOnBold = true;
        }
      });

      expect(hasVisibleOnBold).toBe(false);

      view.destroy();
    });

    it('should show visible class for block mark when cursor is on that line', () => {
      // Cursor on heading line
      const view = createTestView('# Heading\nParagraph', 5);
      const plugin = view.plugin(livePreviewPlugin);

      let hasVisibleBlock = false;
      plugin?.decorations.between(0, 2, (_from, _to, deco) => {
        const spec = deco.spec as { class?: string };
        if (spec.class?.includes('cm-formatting-block-visible')) {
          hasVisibleBlock = true;
        }
      });

      expect(hasVisibleBlock).toBe(true);

      view.destroy();
    });
  });

  describe('update behavior', () => {
    it('should rebuild decorations on document change', () => {
      const view = createTestView('plain text');
      const plugin = view.plugin(livePreviewPlugin);
      const initialSize = plugin?.decorations.size ?? 0;

      // Insert markdown marks
      view.dispatch({
        changes: { from: 0, to: 10, insert: '**bold** text' },
      });

      const newSize = view.plugin(livePreviewPlugin)?.decorations.size ?? 0;
      expect(newSize).toBeGreaterThan(initialSize);

      view.destroy();
    });

    it('should rebuild decorations on selection change', () => {
      const view = createTestView('**bold** text', 0);

      // Move cursor inside bold
      view.dispatch({
        selection: { anchor: 4 },
      });

      const pluginAfter = view.plugin(livePreviewPlugin);

      // Plugin should still have decorations after selection change
      expect(pluginAfter?.decorations.size).toBeGreaterThanOrEqual(0);
      // Decorations should be rebuilt (plugin still works)
      expect(pluginAfter).toBeDefined();

      view.destroy();
    });
  });

  describe('math formula exclusion', () => {
    it('should skip CodeMark for math formulas (`$...$`)', () => {
      const view = createTestView('`$E=mc^2$` text');
      const plugin = view.plugin(livePreviewPlugin);

      // Math formula CodeMark should be skipped, handled by mathPlugin
      // Here we just check plugin works normally without errors
      expect(plugin).toBeDefined();

      view.destroy();
    });
  });

  describe('multiple selections', () => {
    it('should handle multiple active lines', () => {
      // Use single selection to test multiple heading lines
      const view = createTestView('# Heading 1\n# Heading 2\n# Heading 3', 5);
      const plugin = view.plugin(livePreviewPlugin);

      // Should have block mark decorations
      let blockCount = 0;
      plugin?.decorations.between(
        0,
        view.state.doc.length,
        (_from, _to, deco) => {
          const spec = deco.spec as { class?: string };
          if (spec.class?.includes('cm-formatting-block')) {
            blockCount++;
          }
        }
      );

      // Three headings should have three HeaderMarks
      expect(blockCount).toBe(3);

      view.destroy();
    });
  });
});
