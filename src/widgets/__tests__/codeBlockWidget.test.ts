/**
 * 代码块 Widget 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCodeBlockWidget, CodeBlockData } from '../codeBlockWidget';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
});

describe('CodeBlockWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render pre > code structure', () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      expect(dom.tagName).toBe('DIV');
      expect(dom.className).toContain('cm-codeblock-widget');

      const pre = dom.querySelector('pre');
      expect(pre).not.toBeNull();

      const code = pre?.querySelector('code');
      expect(code).not.toBeNull();
    });

    it('should apply syntax highlighting classes', () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      const code = dom.querySelector('code');
      // 高亮后应该包含 hljs 相关的 span
      expect(code?.innerHTML).toContain('hljs');
    });

    it('should display language label', () => {
      const widget = createCodeBlockWidget({
        code: 'print("hello")',
        language: 'python',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 10,
      });

      const dom = widget.toDOM();
      const langLabel = dom.querySelector('.cm-codeblock-lang');
      expect(langLabel).not.toBeNull();
      expect(langLabel?.textContent).toBe('python');
    });

    it('should render copy button when enabled', () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy');
      expect(copyBtn).not.toBeNull();
    });

    it('should not render copy button when disabled', () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy');
      expect(copyBtn).toBeNull();
    });

    it('should render line numbers when enabled', () => {
      const widget = createCodeBlockWidget({
        code: 'line1\nline2\nline3',
        language: 'text',
        showLineNumbers: true,
        showCopyButton: false,
        from: 0,
        codeFrom: 4,
      });

      const dom = widget.toDOM();
      expect(dom.className).toContain('cm-codeblock-line-numbers');
      const lines = dom.querySelectorAll('.line');
      expect(lines.length).toBe(3);
    });

    it('should not render line numbers when disabled', () => {
      const widget = createCodeBlockWidget({
        code: 'line1\nline2',
        language: 'text',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 4,
      });

      const dom = widget.toDOM();
      expect(dom.className).not.toContain('cm-codeblock-line-numbers');
    });
  });

  describe('copy functionality', () => {
    it('should copy code to clipboard on button click', async () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy') as HTMLButtonElement;

      await copyBtn.click();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('const x = 1;');
    });

    it('should show success feedback', async () => {
      const widget = createCodeBlockWidget({
        code: 'test',
        language: 'text',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 4,
      });

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy') as HTMLButtonElement;

      copyBtn.click();

      // 等待异步操作完成
      await vi.waitFor(() => {
        expect(copyBtn.textContent).toBe('Copied!');
      });
    });

    it('should handle copy failure gracefully', async () => {
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Copy failed'));

      const widget = createCodeBlockWidget({
        code: 'test',
        language: 'text',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 4,
      });

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy') as HTMLButtonElement;

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
      const data: CodeBlockData = {
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      };

      const widget1 = createCodeBlockWidget(data);
      const widget2 = createCodeBlockWidget(data);

      expect(widget1.eq(widget2)).toBe(true);
    });

    it('should return false for different code', () => {
      const widget1 = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      const widget2 = createCodeBlockWidget({
        code: 'const y = 2;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different language', () => {
      const widget1 = createCodeBlockWidget({
        code: 'x = 1',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      const widget2 = createCodeBlockWidget({
        code: 'x = 1',
        language: 'python',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 10,
      });

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different options', () => {
      const widget1 = createCodeBlockWidget({
        code: 'x = 1',
        language: 'javascript',
        showLineNumbers: true,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      const widget2 = createCodeBlockWidget({
        code: 'x = 1',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      expect(widget1.eq(widget2)).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy');

      expect(copyBtn?.getAttribute('aria-label')).toBe('Copy code');
    });

    it('should be keyboard accessible', () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: true,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      const copyBtn = dom.querySelector('.cm-codeblock-copy') as HTMLButtonElement;

      // 按钮应该可以通过键盘访问
      expect(copyBtn.tagName).toBe('BUTTON');
      expect(copyBtn.type).toBe('button');
    });
  });

  describe('ignoreEvent', () => {
    it('should return false to allow click events', () => {
      const widget = createCodeBlockWidget({
        code: 'test',
        language: 'text',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 4,
      });

      expect(widget.ignoreEvent()).toBe(false);
    });
  });

  describe('position data', () => {
    it('should store codeFrom in dataset', () => {
      const widget = createCodeBlockWidget({
        code: 'const x = 1;',
        language: 'javascript',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 14,
      });

      const dom = widget.toDOM();
      expect(dom.dataset.codeFrom).toBe('14');
    });

    it('should store line offsets in dataset', () => {
      const widget = createCodeBlockWidget({
        code: 'line1\nline2\nline3',
        language: 'text',
        showLineNumbers: false,
        showCopyButton: false,
        from: 0,
        codeFrom: 4,
      });

      const dom = widget.toDOM();
      const lines = dom.querySelectorAll('.line');

      expect(lines[0].getAttribute('data-offset')).toBe('0');
      expect(lines[1].getAttribute('data-offset')).toBe('6'); // 'line1\n'.length
      expect(lines[2].getAttribute('data-offset')).toBe('12'); // 'line1\nline2\n'.length
    });
  });
});
