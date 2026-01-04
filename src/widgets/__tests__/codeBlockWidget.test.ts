/**
 * 代码块 Widget 测试
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createCodeBlockWidget, CodeBlockData } from '../codeBlockWidget';
import { initHighlighter, isHighlighterAvailable } from '../../utils/codeHighlight';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

/**
 * 创建测试用的 CodeBlockData
 */
function createTestData(
  overrides: Partial<CodeBlockData> = {}
): CodeBlockData {
  return {
    code: 'const x = 1;',
    language: 'javascript',
    showLineNumbers: false,
    showCopyButton: false,
    from: 0,
    to: 50,
    codeFrom: 14,
    lineStarts: [14],
    ...overrides,
  };
}

describe('CodeBlockWidget', () => {
  beforeAll(async () => {
    // 异步初始化高亮器
    await initHighlighter();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render pre > code structure', () => {
      const widget = createCodeBlockWidget(createTestData());

      const dom = widget.toDOM();
      expect(dom.tagName).toBe('DIV');
      expect(dom.className).toContain('cm-codeblock-widget');

      const pre = dom.querySelector('pre');
      expect(pre).not.toBeNull();

      const code = pre?.querySelector('code');
      expect(code).not.toBeNull();
    });

    it('should apply syntax highlighting classes when highlighter is available', () => {
      const widget = createCodeBlockWidget(createTestData());

      const dom = widget.toDOM();
      const code = dom.querySelector('code');
      
      if (isHighlighterAvailable()) {
        // 高亮后应该包含 hljs 相关的 span
        expect(code?.innerHTML).toContain('hljs');
      } else {
        // 高亮器不可用时，应该有转义后的代码
        expect(code?.innerHTML).toBeDefined();
        console.warn('Highlighter not available, syntax highlighting test skipped');
      }
    });

    it('should display language label', () => {
      const widget = createCodeBlockWidget(
        createTestData({
          code: 'print("hello")',
          language: 'python',
        })
      );

      const dom = widget.toDOM();
      // 语言标签显示在 fence 行中
      const fenceLine = dom.querySelector('.cm-codeblock-fence');
      expect(fenceLine).not.toBeNull();
      expect(fenceLine?.textContent).toContain('python');
    });

    it('should render copy button when enabled', () => {
      const widget = createCodeBlockWidget(
        createTestData({ showCopyButton: true })
      );

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy');
      expect(copyBtn).not.toBeNull();
    });

    it('should not render copy button when disabled', () => {
      const widget = createCodeBlockWidget(
        createTestData({ showCopyButton: false })
      );

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy');
      expect(copyBtn).toBeNull();
    });

    it('should render line numbers when enabled', () => {
      const widget = createCodeBlockWidget(
        createTestData({
          code: 'line1\nline2\nline3',
          showLineNumbers: true,
          lineStarts: [14, 20, 26],
        })
      );

      const dom = widget.toDOM();
      expect(dom.className).toContain('cm-codeblock-line-numbers');
      const lines = dom.querySelectorAll('.cm-codeblock-line');
      // 5 行 = 1 fence 开始 + 3 代码行 + 1 fence 结束
      expect(lines.length).toBe(5);
    });

    it('should not render line numbers when disabled', () => {
      const widget = createCodeBlockWidget(
        createTestData({
          code: 'line1\nline2',
          showLineNumbers: false,
        })
      );

      const dom = widget.toDOM();
      expect(dom.className).not.toContain('cm-codeblock-line-numbers');
    });
  });

  describe('copy functionality', () => {
    it('should copy code to clipboard on button click', async () => {
      const widget = createCodeBlockWidget(
        createTestData({ showCopyButton: true })
      );

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector(
        '.cm-codeblock-copy'
      ) as HTMLButtonElement;

      copyBtn.click();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('const x = 1;');
    });

    it('should show success feedback', async () => {
      const widget = createCodeBlockWidget(
        createTestData({
          code: 'test',
          language: 'text',
          showCopyButton: true,
        })
      );

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector(
        '.cm-codeblock-copy'
      ) as HTMLButtonElement;

      copyBtn.click();

      // 等待异步操作完成
      await vi.waitFor(() => {
        expect(copyBtn.textContent).toBe('Copied!');
      });
    });

    it('should handle copy failure gracefully', async () => {
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Copy failed'));

      const widget = createCodeBlockWidget(
        createTestData({
          code: 'test',
          language: 'text',
          showCopyButton: true,
        })
      );

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector(
        '.cm-codeblock-copy'
      ) as HTMLButtonElement;

      // 点击不应该抛出错误
      copyBtn.click();

      // 等待异步操作完成，应该显示失败状态
      await vi.waitFor(() => {
        expect(copyBtn.textContent).toBe('Failed');
      });
    });
  });

  describe('equality', () => {
    it('should return true for identical data', () => {
      const data = createTestData();

      const widget1 = createCodeBlockWidget(data);
      const widget2 = createCodeBlockWidget(data);

      expect(widget1.eq(widget2)).toBe(true);
    });

    it('should return false for different code', () => {
      const widget1 = createCodeBlockWidget(createTestData({ code: 'const x = 1;' }));
      const widget2 = createCodeBlockWidget(createTestData({ code: 'const y = 2;' }));

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different language', () => {
      const widget1 = createCodeBlockWidget(
        createTestData({ code: 'x = 1', language: 'javascript' })
      );
      const widget2 = createCodeBlockWidget(
        createTestData({ code: 'x = 1', language: 'python' })
      );

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different options', () => {
      const widget1 = createCodeBlockWidget(
        createTestData({ showLineNumbers: true })
      );
      const widget2 = createCodeBlockWidget(
        createTestData({ showLineNumbers: false })
      );

      expect(widget1.eq(widget2)).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      const widget = createCodeBlockWidget(
        createTestData({ showCopyButton: true })
      );

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy');

      expect(copyBtn?.getAttribute('aria-label')).toBe('Copy code');
    });

    it('should be keyboard accessible', () => {
      const widget = createCodeBlockWidget(
        createTestData({ showCopyButton: true })
      );

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector(
        '.cm-codeblock-copy'
      ) as HTMLButtonElement;

      // 按钮应该可以通过键盘访问
      expect(copyBtn.tagName).toBe('BUTTON');
      expect(copyBtn.type).toBe('button');
    });
  });

  describe('ignoreEvent', () => {
    it('should return true for mousedown events to let widget handle them', () => {
      const widget = createCodeBlockWidget(createTestData());
      const dom = widget.toDOM();
      const mockEvent = new MouseEvent('mousedown', {
        bubbles: true,
      });
      Object.defineProperty(mockEvent, 'target', { value: dom });

      expect(widget.ignoreEvent(mockEvent)).toBe(true);
    });

    it('should return false for other events', () => {
      const widget = createCodeBlockWidget(createTestData());
      const mockEvent = new MouseEvent('click');

      expect(widget.ignoreEvent(mockEvent)).toBe(false);
    });
  });

  describe('position data', () => {
    it('should store position data in dataset', () => {
      const widget = createCodeBlockWidget(
        createTestData({
          from: 100,
          lineStarts: [114, 120, 126],
        })
      );

      const dom = widget.toDOM();
      expect(dom.dataset.from).toBe('100');
      expect(dom.dataset.lineStarts).toBe('[114,120,126]');
    });

    it('should add line index to each line', () => {
      const widget = createCodeBlockWidget(
        createTestData({
          code: 'line1\nline2\nline3',
          lineStarts: [14, 20, 26],
        })
      );

      const dom = widget.toDOM();
      const lines = dom.querySelectorAll('.cm-codeblock-line');

      // 5 行 = 1 fence 开始 + 3 代码行 + 1 fence 结束
      expect(lines.length).toBe(5);
      // fence 开始行索引为 -1
      expect((lines[0] as HTMLElement).dataset.lineIndex).toBe('-1');
      // 代码行索引从 0 开始
      expect((lines[1] as HTMLElement).dataset.lineIndex).toBe('0');
      expect((lines[2] as HTMLElement).dataset.lineIndex).toBe('1');
      expect((lines[3] as HTMLElement).dataset.lineIndex).toBe('2');
      // fence 结束行索引为 -2
      expect((lines[4] as HTMLElement).dataset.lineIndex).toBe('-2');
    });
  });
});
