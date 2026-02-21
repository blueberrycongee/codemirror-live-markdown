import { describe, it, expect } from 'vitest';
import { renderInlineMarkdown } from '../inlineMarkdown';

describe('renderInlineMarkdown', () => {
  it('should render bold with **', () => {
    expect(renderInlineMarkdown('**bold**')).toBe(
      '<strong class="cm-strong">bold</strong>'
    );
  });

  it('should render bold with __', () => {
    expect(renderInlineMarkdown('__bold__')).toBe(
      '<strong class="cm-strong">bold</strong>'
    );
  });

  it('should render italic with *', () => {
    expect(renderInlineMarkdown('*italic*')).toBe(
      '<em class="cm-emphasis">italic</em>'
    );
  });

  it('should render italic with _', () => {
    expect(renderInlineMarkdown('_italic_')).toBe(
      '<em class="cm-emphasis">italic</em>'
    );
  });

  it('should render strikethrough', () => {
    expect(renderInlineMarkdown('~~deleted~~')).toBe(
      '<del class="cm-strikethrough">deleted</del>'
    );
  });

  it('should render highlight', () => {
    expect(renderInlineMarkdown('==highlighted==')).toBe(
      '<mark class="cm-highlight">highlighted</mark>'
    );
  });

  it('should render inline code', () => {
    expect(renderInlineMarkdown('`code`')).toBe(
      '<code class="cm-code">code</code>'
    );
  });

  it('should return plain text unchanged', () => {
    expect(renderInlineMarkdown('hello world')).toBe('hello world');
  });

  it('should escape HTML special characters', () => {
    expect(renderInlineMarkdown('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('should escape HTML inside markdown', () => {
    expect(renderInlineMarkdown('**<b>xss</b>**')).toBe(
      '<strong class="cm-strong">&lt;b&gt;xss&lt;/b&gt;</strong>'
    );
  });

  it('should handle bold and italic together', () => {
    expect(renderInlineMarkdown('**bold** and *italic*')).toBe(
      '<strong class="cm-strong">bold</strong> and <em class="cm-emphasis">italic</em>'
    );
  });

  it('should not parse markdown inside inline code', () => {
    expect(renderInlineMarkdown('`**not bold**`')).toBe(
      '<code class="cm-code">**not bold**</code>'
    );
  });

  it('should handle multiple inline code spans', () => {
    expect(renderInlineMarkdown('`a` and `b`')).toBe(
      '<code class="cm-code">a</code> and <code class="cm-code">b</code>'
    );
  });

  it('should handle nested bold inside italic-like text', () => {
    // ***text*** → bold wraps first, then italic wraps the strong tag
    const result = renderInlineMarkdown('***text***');
    expect(result).toContain('cm-strong');
    expect(result).toContain('cm-emphasis');
  });

  it('should escape ampersands and quotes', () => {
    expect(renderInlineMarkdown('a & b "c"')).toBe('a &amp; b &quot;c&quot;');
  });
});
