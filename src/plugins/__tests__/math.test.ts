import { describe, it, expect, beforeEach } from 'vitest';
import { renderMath, clearMathCache } from '../../utils/mathCache';

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
