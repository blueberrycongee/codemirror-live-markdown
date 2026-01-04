import { EditorView } from '@codemirror/view';

/**
 * Default theme definition
 *
 * Includes:
 * - Inline mark animations (max-width transition)
 * - Block mark animations (fontSize transition)
 * - Markdown styles (headings, bold, italic, etc.)
 * - Math formula styles
 * - Table styles
 */
export const editorTheme = EditorView.theme({
  // ========== Base Styles ==========
  '&': {
    backgroundColor: 'transparent',
    fontSize: '16px',
    height: '100%',
  },

  '.cm-content': {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: '16px 0',
    caretColor: 'hsl(var(--primary, 220 90% 56%))',
  },

  '.cm-line': {
    padding: '0 16px',
    lineHeight: '1.75',
    position: 'relative',
  },

  // ========== Selection Styles ==========
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(191, 219, 254, 0.25) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(191, 219, 254, 0.35) !important',
  },

  // ========== Inline Mark Animation ==========
  '.cm-formatting-inline': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    verticalAlign: 'baseline',
    color: 'hsl(var(--muted-foreground, 220 9% 46%) / 0.6)',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '0.85em',
    maxWidth: '0',
    opacity: '0',
    transform: 'scaleX(0.8)',
    transition: `
      max-width 0.2s cubic-bezier(0.2, 0, 0.2, 1),
      opacity 0.15s ease-out,
      transform 0.15s ease-out
    `,
    pointerEvents: 'none',
  },

  '.cm-formatting-inline-visible': {
    maxWidth: '4ch',
    opacity: '1',
    transform: 'scaleX(1)',
    margin: '0 1px',
    pointerEvents: 'auto',
  },

  // ========== Block Mark Animation ==========
  '.cm-formatting-block': {
    display: 'inline',
    overflow: 'hidden',
    fontSize: '0.01em',
    lineHeight: 'inherit',
    opacity: '0',
    color: 'hsl(var(--muted-foreground, 220 9% 46%))',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'font-size 0.2s ease-out, opacity 0.2s ease-out',
  },

  '.cm-formatting-block-visible': {
    fontSize: '1em',
    opacity: '0.6',
  },

  // ========== Heading Styles ==========
  '.cm-header-1': {
    fontSize: '2em',
    fontWeight: '700',
    lineHeight: '1.3',
    color: 'hsl(var(--md-heading, var(--foreground, 220 9% 9%)))',
  },
  '.cm-header-2': {
    fontSize: '1.5em',
    fontWeight: '600',
    lineHeight: '1.4',
    color: 'hsl(var(--md-heading, var(--foreground, 220 9% 9%)))',
  },
  '.cm-header-3': {
    fontSize: '1.25em',
    fontWeight: '600',
    lineHeight: '1.5',
    color: 'hsl(var(--md-heading, var(--foreground, 220 9% 9%)))',
  },
  '.cm-header-4, .cm-header-5, .cm-header-6': {
    fontWeight: '600',
    color: 'hsl(var(--md-heading, var(--foreground, 220 9% 9%)))',
  },

  // ========== Inline Styles ==========
  '.cm-strong': {
    fontWeight: '700',
    color: 'hsl(var(--md-bold, var(--foreground, 220 9% 9%)))',
  },
  '.cm-emphasis': {
    fontStyle: 'italic',
    color: 'hsl(var(--md-italic, var(--foreground, 220 9% 9%)))',
  },
  '.cm-strikethrough': {
    textDecoration: 'line-through',
    color: 'hsl(var(--muted-foreground, 220 9% 46%))',
  },
  '.cm-code': {
    backgroundColor: 'hsl(var(--muted, 220 14% 96%))',
    padding: '2px 4px',
    borderRadius: '3px',
    fontFamily: 'monospace',
  },
  '.cm-link': {
    color: 'hsl(var(--md-link, var(--primary, 220 90% 56%)))',
    textDecoration: 'underline',
  },
  '.cm-wikilink': {
    color: 'hsl(var(--primary, 220 90% 56%))',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  '.cm-highlight': {
    backgroundColor: 'hsl(50 100% 50% / 0.4)',
    padding: '1px 2px',
    borderRadius: '2px',
  },

  // ========== Math Formula Styles ==========
  '.cm-math-inline': {
    display: 'inline-block',
    verticalAlign: 'middle',
    cursor: 'pointer',
    animation: 'mathFadeIn 0.15s ease-out',
  },
  '.cm-math-block': {
    display: 'block',
    textAlign: 'center',
    padding: '0.5em 0',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  '.cm-math-source': {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    color: 'hsl(var(--foreground, 220 9% 9%))',
    fontFamily: "'JetBrains Mono', monospace",
    borderRadius: '4px',
    padding: '2px 0',
    cursor: 'text',
    animation: 'mathFadeIn 0.15s ease-out',
  },
  '.cm-math-source-block': {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  '.cm-math-preview-panel': {
    display: 'block',
    textAlign: 'center',
    padding: '8px',
    marginTop: '4px',
    marginBottom: '8px',
    border: '1px solid hsl(var(--border, 220 13% 91%) / 0.5)',
    borderRadius: '6px',
    backgroundColor: 'hsl(var(--muted, 220 14% 96%) / 0.3)',
    pointerEvents: 'none',
    userSelect: 'none',
    opacity: '0.95',
  },

  // ========== Animation Keyframes ==========
  '@keyframes mathFadeIn': {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },

  // ========== Table Styles ==========
  '.cm-table-widget': {
    display: 'block',
    overflowX: 'auto',
    cursor: 'text',
    margin: '8px 0',
  },
  '.cm-table-widget table': {
    borderCollapse: 'collapse',
    width: '100%',
  },
  '.cm-table-widget th, .cm-table-widget td': {
    border: '1px solid hsl(var(--border, 220 13% 91%))',
    padding: '8px 12px',
  },
  '.cm-table-widget th': {
    backgroundColor: 'hsl(var(--muted, 220 14% 96%))',
    fontWeight: '600',
  },
  '.cm-table-source': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    fontFamily: "'JetBrains Mono', monospace !important",
  },

  // ========== Image Styles ==========
  '.cm-image-widget': {
    display: 'block',
    margin: '12px 0',
    cursor: 'pointer',
  },
  '.cm-image-widget img': {
    maxWidth: '100%',
    borderRadius: '6px',
    display: 'block',
  },
  '.cm-image-loading': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '100px',
    backgroundColor: 'hsl(var(--muted, 220 14% 96%))',
    borderRadius: '6px',
    color: 'hsl(var(--muted-foreground, 220 9% 46%))',
    fontSize: '14px',
  },
  '.cm-image-spinner': {
    width: '16px',
    height: '16px',
    border: '2px solid hsl(var(--muted-foreground, 220 9% 46%) / 0.3)',
    borderTopColor: 'hsl(var(--muted-foreground, 220 9% 46%))',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  '.cm-image-error': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '60px',
    backgroundColor: 'hsl(0 84% 95%)',
    borderRadius: '6px',
    color: 'hsl(0 84% 40%)',
    fontSize: '14px',
  },
  '.cm-image-error-icon': {
    fontSize: '18px',
  },
  '.cm-image-alt': {
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground, 220 9% 46%))',
    marginTop: '4px',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  '.cm-image-source': {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
  },
  '.cm-image-info': {
    background: 'hsl(var(--muted, 220 14% 96%))',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground, 220 9% 46%))',
    marginBottom: '4px',
    fontFamily: 'monospace',
  },
  '.markdown-image': {
    maxWidth: '100%',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  // ========== Link Styles ==========
  '.cm-link-widget': {
    color: 'hsl(var(--primary, 220 90% 56%))',
    textDecoration: 'underline',
    cursor: 'pointer',
    transition: 'color 0.15s',
  },
  '.cm-link-widget:hover': {
    color: 'hsl(var(--primary, 220 90% 56%) / 0.8)',
  },
  '.cm-wikilink-widget': {
    color: 'hsl(var(--primary, 220 90% 56%))',
    textDecoration: 'none',
    borderBottom: '1px dashed currentColor',
    cursor: 'pointer',
  },
  '.cm-link-source': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  '.cm-wikilink-source': {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  '.cm-link-preview': {
    position: 'absolute',
    bottom: '100%',
    left: '0',
    padding: '4px 8px',
    backgroundColor: 'hsl(var(--background, 0 0% 100%))',
    border: '1px solid hsl(var(--border, 220 13% 91%))',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground, 220 9% 46%))',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    zIndex: '10',
  },

  // ========== Animation Keyframes ==========
  '@keyframes spin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  // ========== Code Block Styles ==========
  '.cm-codeblock-widget': {
    display: 'block',
    position: 'relative',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: 'hsl(var(--muted, 220 14% 96%))',
  },
  '.cm-codeblock-widget pre': {
    margin: '0',
    padding: '16px',
    overflow: 'auto',
    fontSize: '14px',
    lineHeight: '1.5',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  '.cm-codeblock-widget code': {
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    padding: '0',
  },
  '.cm-codeblock-lang': {
    position: 'absolute',
    top: '8px',
    right: '48px',
    fontSize: '12px',
    color: 'hsl(var(--muted-foreground, 220 9% 46%))',
    textTransform: 'uppercase',
  },
  '.cm-codeblock-copy': {
    position: 'absolute',
    top: '8px',
    right: '8px',
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'hsl(var(--background, 0 0% 100%))',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.2s',
  },
  '.cm-codeblock-copy:hover': {
    backgroundColor: 'hsl(var(--border, 220 13% 91%))',
  },
  '.cm-codeblock-copy-success': {
    color: 'hsl(142 76% 36%)',
  },
  '.cm-codeblock-source': {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  '.cm-codeblock-line-numbers': {
    counterReset: 'line',
  },
  '.cm-codeblock-line-numbers .line::before': {
    counterIncrement: 'line',
    content: 'counter(line)',
    display: 'inline-block',
    width: '2em',
    marginRight: '1em',
    textAlign: 'right',
    color: 'hsl(var(--muted-foreground, 220 9% 46%) / 0.5)',
  },

  // ========== Syntax Highlighting (GitHub-like) ==========
  '.hljs-keyword': { color: '#d73a49' },
  '.hljs-string': { color: '#032f62' },
  '.hljs-number': { color: '#005cc5' },
  '.hljs-function': { color: '#6f42c1' },
  '.hljs-comment': { color: '#6a737d', fontStyle: 'italic' },
  '.hljs-class': { color: '#22863a' },
  '.hljs-variable': { color: '#e36209' },
  '.hljs-operator': { color: '#d73a49' },
  '.hljs-punctuation': { color: '#24292e' },
  '.hljs-title': { color: '#6f42c1' },
  '.hljs-params': { color: '#24292e' },
  '.hljs-built_in': { color: '#005cc5' },
  '.hljs-literal': { color: '#005cc5' },
  '.hljs-attr': { color: '#005cc5' },
  '.hljs-selector-tag': { color: '#22863a' },
  '.hljs-selector-class': { color: '#6f42c1' },
  '.hljs-selector-id': { color: '#005cc5' },
  '.hljs-attribute': { color: '#005cc5' },
  '.hljs-meta': { color: '#005cc5' },
  '.hljs-name': { color: '#22863a' },
});
