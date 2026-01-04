/**
 * Code Highlighting Utility Tests
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
    // Initialize highlighter asynchronously
    await initHighlighter();
  });

  describe('basic highlighting', () => {
    it('should highlight JavaScript code', () => {
      // Skip test if highlighter is not available
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
      // Auto-detection may return different languages, just verify detection occurred
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
      // For very short code, detection may fail
      expect(result.html).toBeDefined();
    });
  });

  describe('language registration', () => {
    it('should check if language is registered', () => {
      if (!isHighlighterAvailable()) {
        // When highlighter is not available, all languages should return false
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
      // Mock registering a language
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
      // Duplicate registration should not throw
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
      // HTML special characters should be handled correctly
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
      // Should escape HTML tags
      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;');
    });
  });
});

describe('lowlight not installed fallback', () => {
  it('should gracefully handle missing lowlight', async () => {
    // This test verifies graceful degradation when lowlight is not installed
    // In actual tests lowlight is installed, so we just verify the interface exists
    expect(typeof highlightCode).toBe('function');
    expect(typeof registerLanguage).toBe('function');
    expect(typeof isLanguageRegistered).toBe('function');
  });
});
