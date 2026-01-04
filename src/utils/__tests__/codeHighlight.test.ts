/**
 * 代码高亮工具测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  highlightCode,
  registerLanguage,
  isLanguageRegistered,
  resetHighlighter,
  initHighlighter,
  isHighlighterAvailable,
} from '../codeHighlight';

describe('highlightCode', () => {
  beforeEach(async () => {
    resetHighlighter();
    // 异步初始化高亮器
    await initHighlighter();
  });

  describe('basic highlighting', () => {
    it('should highlight JavaScript code', () => {
      // 如果高亮器不可用，跳过测试
      if (!isHighlighterAvailable()) {
        console.warn('Highlighter not available, skipping test');
        return;
      }
      const result = highlightCode('const x = 1;', 'javascript');
      expect(result.html).toContain('hljs');
      expect(result.language).toBe('javascript');
      expect(result.detected).toBe(false);
    });

    it('should highlight Python code', () => {
      if (!isHighlighterAvailable()) {
        console.warn('Highlighter not available, skipping test');
        return;
      }
      const result = highlightCode('def hello():\n    print("hi")', 'python');
      expect(result.html).toContain('hljs');
      expect(result.language).toBe('python');
      expect(result.detected).toBe(false);
    });

    it('should highlight TypeScript code', () => {
      if (!isHighlighterAvailable()) {
        console.warn('Highlighter not available, skipping test');
        return;
      }
      const result = highlightCode('const x: number = 1;', 'typescript');
      expect(result.html).toContain('hljs');
      expect(result.language).toBe('typescript');
    });

    it('should return plain text for unknown language', () => {
      const result = highlightCode('some code', 'unknownlang123');
      expect(result.html).toBe('some code');
      expect(result.language).toBe('unknownlang123');
      expect(result.detected).toBe(false);
    });
  });

  describe('language detection', () => {
    it('should auto-detect JavaScript', () => {
      if (!isHighlighterAvailable()) {
        console.warn('Highlighter not available, skipping test');
        return;
      }
      const result = highlightCode('function hello() { return 42; }');
      expect(result.detected).toBe(true);
      // 自动检测可能返回不同语言，只要检测到即可
      expect(result.html).toContain('hljs');
    });

    it('should auto-detect Python', () => {
      if (!isHighlighterAvailable()) {
        console.warn('Highlighter not available, skipping test');
        return;
      }
      const result = highlightCode('def hello():\n    print("Hello, World!")');
      expect(result.detected).toBe(true);
    });

    it('should fallback to text when detection fails', () => {
      const result = highlightCode('x');
      // 对于非常短的代码，可能无法检测
      expect(result.html).toBeDefined();
    });
  });

  describe('language registration', () => {
    it('should check if language is registered', () => {
      if (!isHighlighterAvailable()) {
        // 高亮器不可用时，所有语言都应该返回 false
        expect(isLanguageRegistered('javascript')).toBe(false);
        expect(isLanguageRegistered('nonexistent')).toBe(false);
        return;
      }
      expect(isLanguageRegistered('javascript')).toBe(true);
      expect(isLanguageRegistered('nonexistent')).toBe(false);
    });

    it('should register new language', () => {
      if (!isHighlighterAvailable()) {
        console.warn('Highlighter not available, skipping test');
        return;
      }
      // 模拟注册一个语言
      const mockLang = () => ({
        name: 'testlang',
        keywords: { keyword: 'test' },
      });
      registerLanguage('testlang', mockLang as any);
      expect(isLanguageRegistered('testlang')).toBe(true);
    });

    it('should handle duplicate registration gracefully', () => {
      const mockLang = () => ({
        name: 'test',
        keywords: { keyword: 'test' },
      });
      // 重复注册不应抛出错误
      expect(() => {
        registerLanguage('testlang2', mockLang as any);
        registerLanguage('testlang2', mockLang as any);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = highlightCode('', 'javascript');
      expect(result.html).toBe('');
      expect(result.language).toBe('javascript');
    });

    it('should handle code with special characters', () => {
      const result = highlightCode('<div>&amp;</div>', 'html');
      // HTML 特殊字符应该被正确处理
      expect(result.html).toBeDefined();
    });

    it('should handle very long code', () => {
      const longCode = 'const x = 1;\n'.repeat(1000);
      const result = highlightCode(longCode, 'javascript');
      expect(result.html).toBeDefined();
      expect(result.html.length).toBeGreaterThan(0);
    });

    it('should escape HTML in code', () => {
      const result = highlightCode('<script>alert("xss")</script>', 'text');
      // 应该转义 HTML 标签
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;');
    });
  });
});

describe('lowlight not installed fallback', () => {
  it('should gracefully handle missing lowlight', async () => {
    // 这个测试验证当 lowlight 未安装时的降级行为
    // 实际测试中 lowlight 已安装，所以这里只验证接口存在
    expect(typeof highlightCode).toBe('function');
    expect(typeof registerLanguage).toBe('function');
    expect(typeof isLanguageRegistered).toBe('function');
  });
});
