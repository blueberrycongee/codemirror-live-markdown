/**
 * Math Formula Render Cache
 *
 * Avoids re-rendering identical formulas, improves performance
 */

/**
 * Render cache
 * Key format: "inline:formula" or "block:formula"
 */
const cache = new Map<string, string>();

/**
 * Render math formula
 *
 * @param source - Formula source (without $ symbols)
 * @param displayMode - true = block formula, false = inline formula
 * @returns Rendered HTML string
 *
 * @example
 * ```typescript
 * renderMath('E = mc^2', false) // Inline formula
 * renderMath('\\int_0^\\infty e^{-x^2} dx', true) // Block formula
 * ```
 */
export function renderMath(source: string, displayMode: boolean): string {
  const key = `${displayMode ? 'block' : 'inline'}:${source}`;

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  // Dynamic import KaTeX (user may not have installed)
  try {
    // @ts-expect-error - KaTeX is peer dependency
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
 * Clear render cache
 *
 * Call when KaTeX version updates or config changes
 */
export function clearMathCache(): void {
  cache.clear();
}
