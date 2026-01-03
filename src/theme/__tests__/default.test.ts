import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { editorTheme } from '../default';

describe('editorTheme', () => {
  describe('theme initialization', () => {
    it('should be a valid EditorView extension', () => {
      expect(editorTheme).toBeDefined();
      // editorTheme 应该是一个 Extension
      expect(typeof editorTheme).toBe('object');
    });

    it('should be usable in EditorState', () => {
      const state = EditorState.create({
        doc: 'Hello world',
        extensions: [editorTheme],
      });
      
      expect(state).toBeDefined();
      expect(state.doc.toString()).toBe('Hello world');
    });

    it('should be usable in EditorView', () => {
      const state = EditorState.create({
        doc: 'Hello world',
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      const view = new EditorView({ state, parent: container });
      
      expect(view).toBeDefined();
      expect(view.dom).toBeDefined();
      
      view.destroy();
    });
  });

  describe('theme styles application', () => {
    it('should apply styles to editor container', () => {
      const state = EditorState.create({
        doc: 'Hello world',
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      const view = new EditorView({ state, parent: container });
      
      // 检查编辑器是否有 cm-editor 类
      expect(view.dom.classList.contains('cm-editor')).toBe(true);
      
      view.destroy();
      document.body.removeChild(container);
    });

    it('should create content element', () => {
      const state = EditorState.create({
        doc: 'Hello world',
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      const view = new EditorView({ state, parent: container });
      
      // 检查是否有 cm-content 元素
      const content = view.dom.querySelector('.cm-content');
      expect(content).not.toBeNull();
      
      view.destroy();
      document.body.removeChild(container);
    });

    it('should create line elements', () => {
      const state = EditorState.create({
        doc: 'Line 1\nLine 2',
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      document.body.appendChild(container);
      const view = new EditorView({ state, parent: container });
      
      // 检查是否有 cm-line 元素
      const lines = view.dom.querySelectorAll('.cm-line');
      expect(lines.length).toBeGreaterThan(0);
      
      view.destroy();
      document.body.removeChild(container);
    });
  });

  describe('theme compatibility', () => {
    it('should work with other extensions', () => {
      const state = EditorState.create({
        doc: 'Hello world',
        extensions: [
          editorTheme,
          EditorView.lineWrapping,
        ],
      });
      
      const container = document.createElement('div');
      const view = new EditorView({ state, parent: container });
      
      expect(view).toBeDefined();
      
      view.destroy();
    });

    it('should handle empty document', () => {
      const state = EditorState.create({
        doc: '',
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      const view = new EditorView({ state, parent: container });
      
      expect(view).toBeDefined();
      expect(view.state.doc.length).toBe(0);
      
      view.destroy();
    });

    it('should handle large document', () => {
      const largeDoc = 'Line\n'.repeat(1000);
      const state = EditorState.create({
        doc: largeDoc,
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      const view = new EditorView({ state, parent: container });
      
      expect(view).toBeDefined();
      expect(view.state.doc.lines).toBe(1001); // 1000 lines + 1 empty
      
      view.destroy();
    });
  });

  describe('theme update behavior', () => {
    it('should handle document updates', () => {
      const state = EditorState.create({
        doc: 'Hello',
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      const view = new EditorView({ state, parent: container });
      
      view.dispatch({
        changes: { from: 5, insert: ' world' },
      });
      
      expect(view.state.doc.toString()).toBe('Hello world');
      
      view.destroy();
    });

    it('should handle selection updates', () => {
      const state = EditorState.create({
        doc: 'Hello world',
        extensions: [editorTheme],
      });
      
      const container = document.createElement('div');
      const view = new EditorView({ state, parent: container });
      
      view.dispatch({
        selection: { anchor: 5 },
      });
      
      expect(view.state.selection.main.anchor).toBe(5);
      
      view.destroy();
    });
  });
});
