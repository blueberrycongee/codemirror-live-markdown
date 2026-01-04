/**
 * Code Block Plugin Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { codeBlockField, CodeBlockOptions } from '../codeBlock';
import { mouseSelectingField } from '../../core/mouseSelecting';
import { collapseOnSelectionFacet } from '../../core/facets';

/**
 * Create test EditorView
 */
function createEditor(
  doc: string,
  cursorPos: number,
  options?: CodeBlockOptions
): EditorView {
  const state = EditorState.create({
    doc,
    selection: { anchor: cursorPos },
    extensions: [
      markdown(),
      mouseSelectingField,
      collapseOnSelectionFacet.of(true),
      codeBlockField(options),
    ],
  });

  return new EditorView({
    state,
    parent: document.body,
  });
}

/**
 * Cleanup EditorView
 */
function cleanup(view: EditorView): void {
  view.destroy();
}

describe('codeBlockField', () => {
  let view: EditorView;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(() => {
        view = createEditor('# Hello', 0);
        cleanup(view);
      }).not.toThrow();
    });

    it('should accept options', () => {
      expect(() => {
        view = createEditor('# Hello', 0, {
          lineNumbers: true,
          copyButton: false,
          defaultLanguage: 'javascript',
        });
        cleanup(view);
      }).not.toThrow();
    });

    it('should use default options when not provided', () => {
      expect(() => {
        view = createEditor('# Hello', 0);
        cleanup(view);
      }).not.toThrow();
    });
  });

  describe('detection', () => {
    it('should detect fenced code block', () => {
      const doc = 'Hello\n\n```javascript\nconst x = 1;\n```';
      // Cursor at "Hello", outside code block
      view = createEditor(doc, 0);

      // Cursor outside code block, should have widget
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      cleanup(view);
    });

    it('should extract language from code info', () => {
      const doc = 'Text\n\n```python\nprint("hello")\n```';
      view = createEditor(doc, 0);

      // Check if language was correctly identified
      const content = view.dom.innerHTML;
      // Widget should contain language label
      expect(content).toContain('python');

      cleanup(view);
    });

    it('should handle code block without language', () => {
      const doc = 'Text\n\n```\nsome code\n```';
      view = createEditor(doc, 0);

      // Should have widget
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      cleanup(view);
    });

    it('should ignore math code blocks', () => {
      const doc = 'Text\n\n```math\nx^2 + y^2 = z^2\n```';
      view = createEditor(doc, 0);

      // Math code blocks should not be handled by codeBlockField, no widget
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).toBeNull();

      cleanup(view);
    });
  });

  describe('rendering mode', () => {
    it('should show widget when cursor outside', () => {
      const doc = 'Hello\n\n```javascript\nconst x = 1;\n```\n\nWorld';
      // Cursor at "Hello"
      view = createEditor(doc, 0);

      // Should show widget
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      cleanup(view);
    });

    it('should show source when cursor inside', () => {
      const doc = '```javascript\nconst x = 1;\n```';
      // Cursor inside code block
      view = createEditor(doc, 18);

      // Should show source mode (line decoration)
      const sourceLine = view.dom.querySelector('.cm-codeblock-source');
      expect(sourceLine).not.toBeNull();

      cleanup(view);
    });

    it('should show source when cursor on fence', () => {
      const doc = '```javascript\nconst x = 1;\n```';
      // Cursor on start fence
      view = createEditor(doc, 5);

      // Should show source mode
      const sourceLine = view.dom.querySelector('.cm-codeblock-source');
      expect(sourceLine).not.toBeNull();

      cleanup(view);
    });
  });

  describe('updates', () => {
    it('should update on document change', () => {
      const doc = 'Hello\n\n```javascript\nconst x = 1;\n```';
      // Cursor at "Hello", outside code block
      view = createEditor(doc, 0);

      // Modify document (code block content)
      view.dispatch({
        changes: { from: 21, to: 33, insert: 'let y = 2;' },
      });

      // Should still have widget
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      cleanup(view);
    });

    it('should update on selection change', () => {
      const doc = 'Hello\n\n```javascript\nconst x = 1;\n```';
      view = createEditor(doc, 0);

      // Initial state should show widget
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      // Move cursor into code block
      view.dispatch({
        selection: { anchor: 20 },
      });

      // Should switch to source mode
      const sourceLine = view.dom.querySelector('.cm-codeblock-source');
      expect(sourceLine).not.toBeNull();

      cleanup(view);
    });
  });

  describe('multiple blocks', () => {
    it('should handle multiple code blocks', () => {
      const doc =
        '```javascript\nconst x = 1;\n```\n\n```python\nprint("hi")\n```';
      view = createEditor(doc, 0);

      // Should have at least one widget (Lezer parsing may vary)
      const widgets = view.dom.querySelectorAll('.cm-codeblock-widget');
      expect(widgets.length).toBeGreaterThanOrEqual(1);

      cleanup(view);
    });

    it('should handle adjacent code blocks', () => {
      const doc = '```js\na\n```\n\n```py\nb\n```';
      view = createEditor(doc, 0);

      const widgets = view.dom.querySelectorAll('.cm-codeblock-widget');
      expect(widgets.length).toBeGreaterThanOrEqual(1);

      cleanup(view);
    });
  });

  describe('integration', () => {
    it('should not conflict with regular content', () => {
      const doc =
        '# Title\n\nSome text\n\n```javascript\ncode\n```\n\nMore text';
      view = createEditor(doc, 0);

      // Code block should render normally
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      // Other content should display normally
      expect(view.state.doc.toString()).toContain('# Title');

      cleanup(view);
    });
  });
});
