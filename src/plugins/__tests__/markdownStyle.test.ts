import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { markdownStylePlugin } from '../markdownStyle';

/**
 * 创建测试用的 EditorView
 */
function createTestView(doc: string) {
  const state = EditorState.create({
    doc,
    extensions: [markdown(), markdownStylePlugin],
  });

  const container = document.createElement('div');
  return new EditorView({ state, parent: container });
}

/**
 * 检查装饰中是否包含指定的 CSS 类
 */
function hasDecorationClass(view: EditorView, className: string): boolean {
  const plugin = view.plugin(markdownStylePlugin);
  let found = false;
  plugin?.decorations.between(0, view.state.doc.length, (_from, _to, deco) => {
    const spec = deco.spec as { class?: string };
    if (spec.class?.includes(className)) {
      found = true;
    }
  });
  return found;
}

describe('markdownStylePlugin', () => {
  describe('plugin initialization', () => {
    it('should create decorations on initialization', () => {
      const view = createTestView('# Heading');
      const plugin = view.plugin(markdownStylePlugin);
      
      expect(plugin).toBeDefined();
      expect(plugin?.decorations).toBeDefined();
      
      view.destroy();
    });

    it('should handle empty document', () => {
      const view = createTestView('');
      const plugin = view.plugin(markdownStylePlugin);
      
      expect(plugin?.decorations.size).toBe(0);
      
      view.destroy();
    });

    it('should handle plain text without markdown', () => {
      const view = createTestView('Just plain text without any markdown');
      const plugin = view.plugin(markdownStylePlugin);
      
      // 纯文本不应该有任何装饰
      expect(plugin?.decorations.size).toBe(0);
      
      view.destroy();
    });
  });

  describe('heading styles', () => {
    it('should apply cm-header-1 to H1', () => {
      const view = createTestView('# Heading 1');
      expect(hasDecorationClass(view, 'cm-header-1')).toBe(true);
      view.destroy();
    });

    it('should apply cm-header-2 to H2', () => {
      const view = createTestView('## Heading 2');
      expect(hasDecorationClass(view, 'cm-header-2')).toBe(true);
      view.destroy();
    });

    it('should apply cm-header-3 to H3', () => {
      const view = createTestView('### Heading 3');
      expect(hasDecorationClass(view, 'cm-header-3')).toBe(true);
      view.destroy();
    });

    it('should apply cm-header-4 to H4', () => {
      const view = createTestView('#### Heading 4');
      expect(hasDecorationClass(view, 'cm-header-4')).toBe(true);
      view.destroy();
    });

    it('should apply cm-header-5 to H5', () => {
      const view = createTestView('##### Heading 5');
      expect(hasDecorationClass(view, 'cm-header-5')).toBe(true);
      view.destroy();
    });

    it('should apply cm-header-6 to H6', () => {
      const view = createTestView('###### Heading 6');
      expect(hasDecorationClass(view, 'cm-header-6')).toBe(true);
      view.destroy();
    });

    it('should apply cm-heading-line to heading lines', () => {
      const view = createTestView('# Heading');
      expect(hasDecorationClass(view, 'cm-heading-line')).toBe(true);
      view.destroy();
    });
  });

  describe('inline styles', () => {
    it('should apply cm-strong to bold text', () => {
      const view = createTestView('**bold text**');
      expect(hasDecorationClass(view, 'cm-strong')).toBe(true);
      view.destroy();
    });

    it('should apply cm-emphasis to italic text', () => {
      const view = createTestView('*italic text*');
      expect(hasDecorationClass(view, 'cm-emphasis')).toBe(true);
      view.destroy();
    });

    it('should apply cm-code to inline code', () => {
      const view = createTestView('`inline code`');
      expect(hasDecorationClass(view, 'cm-code')).toBe(true);
      view.destroy();
    });

    it('should apply cm-link to links', () => {
      const view = createTestView('[link text](https://example.com)');
      expect(hasDecorationClass(view, 'cm-link')).toBe(true);
      view.destroy();
    });
  });

  describe('update behavior', () => {
    it('should rebuild decorations on document change', () => {
      const view = createTestView('plain text');
      
      // 初始状态没有装饰
      expect(view.plugin(markdownStylePlugin)?.decorations.size).toBe(0);
      
      // 插入标题
      view.dispatch({
        changes: { from: 0, to: 10, insert: '# Heading' },
      });
      
      // 应该有装饰了
      expect(hasDecorationClass(view, 'cm-header-1')).toBe(true);
      
      view.destroy();
    });

    it('should handle multiple markdown elements', () => {
      const doc = '# Heading\n\n**bold** and *italic*\n\n`code`';
      const view = createTestView(doc);
      
      expect(hasDecorationClass(view, 'cm-header-1')).toBe(true);
      expect(hasDecorationClass(view, 'cm-strong')).toBe(true);
      expect(hasDecorationClass(view, 'cm-emphasis')).toBe(true);
      expect(hasDecorationClass(view, 'cm-code')).toBe(true);
      
      view.destroy();
    });
  });

  describe('nested styles', () => {
    it('should handle bold inside heading', () => {
      const view = createTestView('# **Bold Heading**');
      
      expect(hasDecorationClass(view, 'cm-header-1')).toBe(true);
      expect(hasDecorationClass(view, 'cm-strong')).toBe(true);
      
      view.destroy();
    });

    it('should handle italic inside bold', () => {
      const view = createTestView('***bold and italic***');
      const plugin = view.plugin(markdownStylePlugin);
      
      // 应该有装饰
      expect(plugin?.decorations.size).toBeGreaterThan(0);
      
      view.destroy();
    });
  });
});
