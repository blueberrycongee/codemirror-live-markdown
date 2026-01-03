import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { renderMath, clearMathCache } from '../../utils/mathCache';
import { mathPlugin, blockMathField } from '../math';
import { mouseSelectingField } from '../../core/mouseSelecting';
import { collapseOnSelectionFacet } from '../../core/facets';

describe('mathPlugin', () => {
  beforeEach(() => {
    // Mock KaTeX
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).window = {
      katex: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
        renderToString: (source: string, options: any) => {
          if (source.includes('invalid')) {
            throw new Error('KaTeX parse error');
          }
          const mode = options?.displayMode ? 'block' : 'inline';
          return `<span class="katex katex-${mode}">${source}</span>`;
        },
      },
    };
    clearMathCache();
  });

  describe('renderMath utility', () => {
    it('should render inline math', () => {
      const result = renderMath('E = mc^2', false);
      expect(result).toContain('katex');
      expect(result).toContain('E = mc^2');
    });

    it('should render block math', () => {
      const result = renderMath('\\int_0^\\infty e^{-x^2} dx', true);
      expect(result).toContain('katex');
    });

    it('should handle invalid math gracefully', () => {
      const result = renderMath('invalid\\syntax', false);
      expect(result).toContain('Math Error');
    });

    it('should cache rendered results', () => {
      const result1 = renderMath('x^2', false);
      const result2 = renderMath('x^2', false);
      expect(result1).toBe(result2); // 应该返回相同的引用（缓存）
    });

    it('should differentiate inline and block cache', () => {
      const inline = renderMath('x^2', false);
      const block = renderMath('x^2', true);
      expect(inline).not.toBe(block); // 不同的缓存键
    });

    it('should clear cache', () => {
      renderMath('x^2', false);
      clearMathCache();
      // 缓存已清空，但功能仍正常
      const result = renderMath('x^2', false);
      expect(result).toContain('katex');
    });
  });

  describe('inline math plugin', () => {
    function createTestView(doc: string, cursorPos?: number) {
      const state = EditorState.create({
        doc,
        selection: cursorPos !== undefined ? { anchor: cursorPos } : undefined,
        extensions: [
          markdown(),
          mouseSelectingField,
          collapseOnSelectionFacet.of(true),
          mathPlugin,
        ],
      });
      const container = document.createElement('div');
      return new EditorView({ state, parent: container });
    }

    it('should initialize without errors', () => {
      const view = createTestView('`$E=mc^2$`');
      const plugin = view.plugin(mathPlugin);
      
      expect(plugin).toBeDefined();
      expect(plugin?.decorations).toBeDefined();
      
      view.destroy();
    });

    it('should handle empty document', () => {
      const view = createTestView('');
      const plugin = view.plugin(mathPlugin);
      
      expect(plugin?.decorations.size).toBe(0);
      
      view.destroy();
    });

    it('should handle document without math', () => {
      const view = createTestView('Just plain text');
      const plugin = view.plugin(mathPlugin);
      
      expect(plugin?.decorations.size).toBe(0);
      
      view.destroy();
    });

    it('should detect inline math formula', () => {
      const view = createTestView('`$E=mc^2$`');
      const plugin = view.plugin(mathPlugin);
      
      // 应该有装饰（replace widget 或 mark）
      expect(plugin?.decorations.size).toBeGreaterThan(0);
      
      view.destroy();
    });

    it('should show source when cursor is inside formula', () => {
      // 光标在公式内部
      const view = createTestView('`$E=mc^2$`', 5);
      const plugin = view.plugin(mathPlugin);
      
      let hasSourceClass = false;
      plugin?.decorations.between(0, view.state.doc.length, (_from, _to, deco) => {
        const spec = deco.spec as { class?: string };
        if (spec.class?.includes('cm-math-source')) {
          hasSourceClass = true;
        }
      });
      
      expect(hasSourceClass).toBe(true);
      
      view.destroy();
    });

    it('should rebuild on document change', () => {
      const view = createTestView('plain text');
      
      view.dispatch({
        changes: { from: 0, to: 10, insert: '`$x^2$`' },
      });
      
      const plugin = view.plugin(mathPlugin);
      expect(plugin?.decorations.size).toBeGreaterThan(0);
      
      view.destroy();
    });

    it('should rebuild on selection change', () => {
      const view = createTestView('`$E=mc^2$` text', 15);
      
      // 移动光标到公式内部
      view.dispatch({
        selection: { anchor: 5 },
      });
      
      const plugin = view.plugin(mathPlugin);
      expect(plugin).toBeDefined();
      
      view.destroy();
    });
  });

  describe('block math field', () => {
    function createTestView(doc: string, cursorPos?: number) {
      const state = EditorState.create({
        doc,
        selection: cursorPos !== undefined ? { anchor: cursorPos } : undefined,
        extensions: [
          markdown(),
          mouseSelectingField,
          collapseOnSelectionFacet.of(true),
          blockMathField,
        ],
      });
      const container = document.createElement('div');
      return new EditorView({ state, parent: container });
    }

    it('should initialize without errors', () => {
      const view = createTestView('```math\nx^2\n```');
      const decos = view.state.field(blockMathField);
      
      expect(decos).toBeDefined();
      
      view.destroy();
    });

    it('should handle empty document', () => {
      const view = createTestView('');
      const decos = view.state.field(blockMathField);
      
      expect(decos.size).toBe(0);
      
      view.destroy();
    });

    it('should detect block math formula', () => {
      const view = createTestView('```math\nx^2\n```');
      const decos = view.state.field(blockMathField);
      
      expect(decos.size).toBeGreaterThan(0);
      
      view.destroy();
    });

    it('should show source when cursor is inside block', () => {
      // 光标在代码块内部
      const view = createTestView('```math\nx^2\n```', 10);
      const decos = view.state.field(blockMathField);
      
      let hasSourceClass = false;
      decos.between(0, view.state.doc.length, (_from, _to, deco) => {
        const spec = deco.spec as { class?: string };
        if (spec.class?.includes('cm-math-source-block')) {
          hasSourceClass = true;
        }
      });
      
      expect(hasSourceClass).toBe(true);
      
      view.destroy();
    });

    it('should update on document change', () => {
      const view = createTestView('plain text');
      
      view.dispatch({
        changes: { from: 0, to: 10, insert: '```math\ny^2\n```' },
      });
      
      const decos = view.state.field(blockMathField);
      expect(decos.size).toBeGreaterThan(0);
      
      view.destroy();
    });

    it('should update on selection change', () => {
      const view = createTestView('```math\nx^2\n```\n\ntext', 20);
      
      // 移动光标到代码块内部
      view.dispatch({
        selection: { anchor: 10 },
      });
      
      const decos = view.state.field(blockMathField);
      expect(decos).toBeDefined();
      
      view.destroy();
    });
  });
});
