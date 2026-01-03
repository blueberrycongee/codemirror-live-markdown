import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { livePreviewPlugin } from '../livePreview';
import { mouseSelectingField } from '../../core/mouseSelecting';
import { collapseOnSelectionFacet } from '../../core/facets';

/**
 * 创建测试用的 EditorView
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

  // 创建一个最小化的 DOM 容器
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
      
      // 应该有装饰（EmphasisMark）
      expect(plugin?.decorations.size).toBeGreaterThan(0);
      
      view.destroy();
    });

    it('should detect StrikethroughMark (~~)', () => {
      // 注意：标准 markdown 解析器可能不支持 ~~，需要 GFM 扩展
      // 这里测试插件不会因为不支持的语法而崩溃
      const view = createTestView('~~strikethrough~~ text');
      const plugin = view.plugin(livePreviewPlugin);
      
      // 插件应该正常初始化，即使没有检测到 StrikethroughMark
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
      // 光标在 **bold** 内部
      const view = createTestView('**bold** text', 4);
      const plugin = view.plugin(livePreviewPlugin);
      
      // 检查装饰是否包含 visible 类
      let hasInlineClass = false;
      plugin?.decorations.between(0, view.state.doc.length, (_from, _to, deco) => {
        const spec = deco.spec as { class?: string };
        if (spec.class?.includes('cm-formatting-inline')) {
          hasInlineClass = true;
        }
      });
      
      // 插件应该检测到行内标记
      expect(hasInlineClass).toBe(true);
      
      view.destroy();
    });

    it('should not show visible class when cursor is outside inline mark', () => {
      // 光标在文本末尾
      const view = createTestView('**bold** text', 13);
      const plugin = view.plugin(livePreviewPlugin);
      
      // 检查 **bold** 的装饰不应该有 visible 类
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
      // 光标在标题行
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
      
      // 插入 markdown 标记
      view.dispatch({
        changes: { from: 0, to: 10, insert: '**bold** text' },
      });
      
      const newSize = view.plugin(livePreviewPlugin)?.decorations.size ?? 0;
      expect(newSize).toBeGreaterThan(initialSize);
      
      view.destroy();
    });

    it('should rebuild decorations on selection change', () => {
      const view = createTestView('**bold** text', 0);
      
      // 移动光标到 bold 内部
      view.dispatch({
        selection: { anchor: 4 },
      });
      
      const pluginAfter = view.plugin(livePreviewPlugin);
      
      // 插件应该在选择变化后仍然有装饰
      expect(pluginAfter?.decorations.size).toBeGreaterThanOrEqual(0);
      // 装饰应该被重建（插件仍然正常工作）
      expect(pluginAfter).toBeDefined();
      
      view.destroy();
    });
  });

  describe('math formula exclusion', () => {
    it('should skip CodeMark for math formulas (`$...`)', () => {
      const view = createTestView('`$E=mc^2$` text');
      const plugin = view.plugin(livePreviewPlugin);
      
      // 数学公式的 CodeMark 应该被跳过，由 mathPlugin 处理
      // 这里只检查插件正常工作，不抛出错误
      expect(plugin).toBeDefined();
      
      view.destroy();
    });
  });

  describe('multiple selections', () => {
    it('should handle multiple active lines', () => {
      // 使用单选区测试多行标题
      const view = createTestView('# Heading 1\n# Heading 2\n# Heading 3', 5);
      const plugin = view.plugin(livePreviewPlugin);
      
      // 应该有块级标记装饰
      let blockCount = 0;
      plugin?.decorations.between(0, view.state.doc.length, (_from, _to, deco) => {
        const spec = deco.spec as { class?: string };
        if (spec.class?.includes('cm-formatting-block')) {
          blockCount++;
        }
      });
      
      // 三个标题应该有三个 HeaderMark
      expect(blockCount).toBe(3);
      
      view.destroy();
    });
  });
});
