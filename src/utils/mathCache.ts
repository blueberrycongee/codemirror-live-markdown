/**
 * 数学公式渲染缓存
 * 
 * 避免重复渲染相同的公式，提升性能
 */

/**
 * 渲染缓存
 * key 格式: "inline:公式内容" 或 "block:公式内容"
 */
const cache = new Map<string, string>();

/**
 * 渲染数学公式
 * 
 * @param source - 公式源码（不包含 $ 符号）
 * @param displayMode - true = 块级公式, false = 行内公式
 * @returns 渲染后的 HTML 字符串
 * 
 * @example
 * ```typescript
 * renderMath('E = mc^2', false) // 行内公式
 * renderMath('\\int_0^\\infty e^{-x^2} dx', true) // 块级公式
 * ```
 */
export function renderMath(source: string, displayMode: boolean): string {
  const key = `${displayMode ? 'block' : 'inline'}:${source}`;
  
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  // 动态导入 KaTeX（用户可能没有安装）
  try {
    // @ts-expect-error - KaTeX 是 peer dependency
    const katex = window.katex;
    
    if (!katex) {
      throw new Error('KaTeX not found. Please install katex package.');
    }

    const rendered = katex.renderToString(source, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      strict: false,
    });

    cache.set(key, rendered);
    return rendered;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return `<span class="cm-math-error">[Math Error: ${errorMsg}]</span>`;
  }
}

/**
 * 清空渲染缓存
 * 
 * 在 KaTeX 版本更新或配置变化时调用
 */
export function clearMathCache(): void {
  cache.clear();
}
