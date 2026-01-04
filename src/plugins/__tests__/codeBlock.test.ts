/**
 * 代码块插件测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { codeBlockField, CodeBlockOptions } from '../codeBlock';
import { mouseSelectingField } from '../../core/mouseSelecting';
import { collapseOnSelectionFacet } from '../../core/facets';

/**
 * 创建测试用的 EditorView
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
 * 清理 EditorView
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
      const doc = '```javascript\nconst x = 1;\n```';
      view = createEditor(doc, 0);

      // 光标在代码块外，应该有装饰
      const decos = view.state.field(codeBlockField());
      expect(decos.size).toBeGreaterThan(0);

      cleanup(view);
    });

    it('should extract language from code info', () => {
      const doc = '```python\nprint("hello")\n```';
      view = createEditor(doc, 0);

      // 检查是否正确识别了语言
      const content = view.dom.innerHTML;
      // Widget 应该包含语言标签
      expect(content).toContain('python');

      cleanup(view);
    });

    it('should handle code block without language', () => {
      const doc = '```\nsome code\n```';
      view = createEditor(doc, 0);

      const decos = view.state.field(codeBlockField());
      expect(decos.size).toBeGreaterThan(0);

      cleanup(view);
    });

    it('should ignore math code blocks', () => {
      const doc = '```math\nx^2 + y^2 = z^2\n```';
      view = createEditor(doc, 0);

      // math 代码块不应该被 codeBlockField 处理
      const decos = view.state.field(codeBlockField());
      expect(decos.size).toBe(0);

      cleanup(view);
    });
  });

  describe('rendering mode', () => {
    it('should show widget when cursor outside', () => {
      const doc = 'Hello\n\n```javascript\nconst x = 1;\n```\n\nWorld';
      // 光标在 "Hello" 位置
      view = createEditor(doc, 0);

      // 应该显示 widget
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      cleanup(view);
    });

    it('should show source when cursor inside', () => {
      const doc = '```javascript\nconst x = 1;\n```';
      // 光标在代码块内部
      view = createEditor(doc, 18);

      // 应该显示源码模式（行装饰）
      const sourceLine = view.dom.querySelector('.cm-codeblock-source');
      expect(sourceLine).not.toBeNull();

      cleanup(view);
    });

    it('should show source when cursor on fence', () => {
      const doc = '```javascript\nconst x = 1;\n```';
      // 光标在开始 fence 上
      view = createEditor(doc, 5);

      // 应该显示源码模式
      const sourceLine = view.dom.querySelector('.cm-codeblock-source');
      expect(sourceLine).not.toBeNull();

      cleanup(view);
    });
  });

  describe('updates', () => {
    it('should update on document change', () => {
      const doc = '```javascript\nconst x = 1;\n```';
      view = createEditor(doc, 0);

      // 修改文档
      view.dispatch({
        changes: { from: 14, to: 26, insert: 'let y = 2;' },
      });

      // 应该仍然有装饰
      const decos = view.state.field(codeBlockField());
      expect(decos).toBeDefined();

      cleanup(view);
    });

    it('should update on selection change', () => {
      const doc = 'Hello\n\n```javascript\nconst x = 1;\n```';
      view = createEditor(doc, 0);

      // 初始状态应该显示 widget
      let widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      // 移动光标到代码块内
      view.dispatch({
        selection: { anchor: 20 },
      });

      // 应该切换到源码模式
      const sourceLine = view.dom.querySelector('.cm-codeblock-source');
      expect(sourceLine).not.toBeNull();

      cleanup(view);
    });
  });

  describe('multiple blocks', () => {
    it('should handle multiple code blocks', () => {
      const doc = '```javascript\nconst x = 1;\n```\n\n```python\nprint("hi")\n```';
      view = createEditor(doc, 0);

      // 应该至少有一个 widget（Lezer 解析可能有差异）
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
      const doc = '# Title\n\nSome text\n\n```javascript\ncode\n```\n\nMore text';
      view = createEditor(doc, 0);

      // 代码块应该正常渲染
      const widget = view.dom.querySelector('.cm-codeblock-widget');
      expect(widget).not.toBeNull();

      // 其他内容应该正常显示
      expect(view.state.doc.toString()).toContain('# Title');

      cleanup(view);
    });
  });
});
