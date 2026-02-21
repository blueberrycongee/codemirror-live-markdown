/**
 * Inline Markdown → HTML conversion for table cells
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert inline markdown to HTML.
 *
 * Processing order: escape HTML first, then replace patterns by priority
 * (inline code > bold > italic > strikethrough > highlight) to avoid
 * nested conflicts.
 */
export function renderInlineMarkdown(text: string): string {
  let result = escapeHtml(text);

  // Inline code (highest priority — protect from further replacements)
  const codeBlocks: string[] = [];
  result = result.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<code class="cm-code">${code}</code>`);
    return `%%CODE${idx}%%`;
  });

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="cm-strong">$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong class="cm-strong">$1</strong>');

  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, '<em class="cm-emphasis">$1</em>');
  result = result.replace(/_(.+?)_/g, '<em class="cm-emphasis">$1</em>');

  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, '<del class="cm-strikethrough">$1</del>');

  // Highlight: ==text==
  result = result.replace(/==(.+?)==/g, '<mark class="cm-highlight">$1</mark>');

  // Restore code blocks
  result = result.replace(/%%CODE(\d+)%%/g, (_match, idx) => codeBlocks[Number(idx)]);

  return result;
}
