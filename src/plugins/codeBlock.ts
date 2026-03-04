/**
 * Code Block Plugin
 *
 * Implements syntax highlighting preview for Markdown code blocks
 * Shows rendered result when cursor is outside code block, shows source when inside
 * Supports precise click position mapping
 *
 * Modes:
 * - auto: shows rendered widget normally, switches to source on cursor enter
 * - toggle: shows rendered widget by default, requires explicit button click for source
 * - inline: replaces only fence lines, keeps code content in contentDOM for native editing
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Prec, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import {
  createCodeBlockSourceToggleWidget,
  createCodeBlockWidget,
} from '../widgets/codeBlockWidget';
import { highlightCodeHast } from '../utils/codeHighlight';
import {
  CodeBlockSourceModeToggle,
  setCodeBlockSourceMode,
} from './codeBlockEffects';

/**
 * Code block plugin configuration
 */
export interface CodeBlockOptions {
  /** Whether to show line numbers, default false */
  lineNumbers?: boolean;
  /** Whether to show copy button, default true */
  copyButton?: boolean;
  /** Default language, default 'text' */
  defaultLanguage?: string;
  /** Interaction mode: auto follows cursor, toggle uses explicit button, inline keeps code editable */
  interaction?: 'auto' | 'toggle' | 'inline';
}

export interface CodeBlockEditorOptions
  extends Omit<CodeBlockOptions, 'interaction'> {}

const defaultOptions: Required<CodeBlockOptions> = {
  lineNumbers: false,
  copyButton: true,
  defaultLanguage: 'text',
  interaction: 'auto',
};

/**
 * Languages to skip (handled by other plugins)
 */
const SKIP_LANGUAGES = new Set(['math']);

interface CodeBlockSourceRange {
  from: number;
  to: number;
}

function rangesOverlap(a: CodeBlockSourceRange, b: CodeBlockSourceRange): boolean {
  return a.from <= b.to && a.to >= b.from;
}

function removeRange(
  ranges: CodeBlockSourceRange[],
  target: CodeBlockSourceRange
): CodeBlockSourceRange[] {
  return ranges.filter((range) => !rangesOverlap(range, target));
}

function addRange(
  ranges: CodeBlockSourceRange[],
  next: CodeBlockSourceRange
): CodeBlockSourceRange[] {
  if (ranges.some((range) => rangesOverlap(range, next))) {
    return ranges;
  }
  return [...ranges, next];
}

function isCodeBlockInSourceMode(
  ranges: CodeBlockSourceRange[],
  from: number,
  to: number
): boolean {
  return ranges.some((range) => range.from <= to && range.to >= from);
}

const codeBlockSourceModeField = StateField.define<CodeBlockSourceRange[]>({
  create: () => [],
  update(ranges, tr) {
    let next = ranges.map((range) => ({
      from: tr.changes.mapPos(range.from, 1),
      to: tr.changes.mapPos(range.to, -1),
    }));

    for (const effect of tr.effects) {
      if (!effect.is(setCodeBlockSourceMode)) continue;
      const { from, to, showSource } = effect.value as CodeBlockSourceModeToggle;
      const mapped = {
        from: tr.changes.mapPos(from, 1),
        to: tr.changes.mapPos(to, -1),
      };
      next = showSource ? addRange(next, mapped) : removeRange(next, mapped);
    }

    return next;
  },
});

// ─── Inline mode widgets ───────────────────────────────────────────────

/**
 * Header widget replacing the opening fence line (```lang)
 * Shows language badge, copy button, and MD (source-toggle) button
 */
class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly language: string,
    readonly code: string,
    readonly from: number,
    readonly to: number,
    readonly showCopyButton: boolean
  ) {
    super();
  }

  eq(other: CodeBlockHeaderWidget): boolean {
    return (
      other.language === this.language &&
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to &&
      other.showCopyButton === this.showCopyButton
    );
  }

  toDOM(view?: EditorView): HTMLElement {
    const header = document.createElement('div');
    header.className = 'cm-codeblock-header';

    // Language badge
    if (this.language && this.language !== 'text') {
      const badge = document.createElement('span');
      badge.className = 'cm-codeblock-lang';
      badge.textContent = this.language;
      header.appendChild(badge);
    }

    // Spacer
    const spacer = document.createElement('span');
    spacer.style.flex = '1';
    header.appendChild(spacer);

    // Copy button
    if (this.showCopyButton) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cm-codeblock-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', 'Copy code');
      const code = this.code;
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(code);
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('cm-codeblock-copy-success');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('cm-codeblock-copy-success');
          }, 2000);
        } catch {
          copyBtn.textContent = 'Failed';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        }
      });
      header.appendChild(copyBtn);
    }

    // MD button (switch to source mode)
    const mdBtn = document.createElement('button');
    mdBtn.type = 'button';
    mdBtn.className = 'cm-codeblock-toggle';
    mdBtn.textContent = 'MD';
    mdBtn.setAttribute('aria-label', 'Show markdown source');
    const from = this.from;
    const to = this.to;
    mdBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!view) return;
      view.dispatch({
        effects: setCodeBlockSourceMode.of({ from, to, showSource: true }),
        scrollIntoView: true,
      });
      view.focus();
    });
    header.appendChild(mdBtn);

    return header;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

/**
 * Footer widget replacing the closing fence line (```)
 * Visual element: rounded bottom + background color
 */
class CodeBlockFooterWidget extends WidgetType {
  eq(): boolean {
    return true;
  }

  toDOM(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'cm-codeblock-footer';
    return footer;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

// ─── HAST → Mark decorations ──────────────────────────────────────────

interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: { className?: string[] };
  children?: HastNode[];
}

/**
 * Convert lowlight HAST tree to Decoration.mark ranges for syntax highlighting.
 * Walks the tree and creates mark decorations for text nodes with CSS classes.
 */
function hastToMarkDecorations(
  root: HastNode,
  basePos: number
): Range<Decoration>[] {
  const result: Range<Decoration>[] = [];
  let offset = 0;

  function walk(node: HastNode, cls?: string) {
    if (node.type === 'text') {
      const len = node.value?.length || 0;
      if (cls && len > 0) {
        result.push(
          Decoration.mark({ class: cls }).range(
            basePos + offset,
            basePos + offset + len
          )
        );
      }
      offset += len;
    } else if (node.type === 'element' || node.type === 'root') {
      const nodeClass = node.properties?.className?.join(' ');
      const effectiveClass = nodeClass || cls;
      if (node.children) {
        for (const child of node.children) {
          walk(child, effectiveClass);
        }
      }
    }
  }

  walk(root);
  return result;
}

// ─── Build inline decorations ─────────────────────────────────────────

/**
 * Build decorations for inline mode:
 * - Render mode: replace fences with header/footer widgets, add line + mark decorations
 * - Source mode: show full source with toggle button
 */
function buildCodeBlockInlineDecorations(
  state: EditorState,
  options: Required<CodeBlockOptions>
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const sourceRanges = state.field(codeBlockSourceModeField);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name !== 'FencedCode') return;

      // Get language info
      const codeInfo = node.node.getChild('CodeInfo');
      let language = options.defaultLanguage;
      if (codeInfo) {
        language = state.doc.sliceString(codeInfo.from, codeInfo.to).trim();
      }

      // Skip special languages
      if (SKIP_LANGUAGES.has(language)) return;

      // Get code content
      const codeText = node.node.getChild('CodeText');
      const code = codeText
        ? state.doc.sliceString(codeText.from, codeText.to)
        : '';

      const showSource = isCodeBlockInSourceMode(
        sourceRanges,
        node.from,
        node.to
      );

      if (showSource) {
        // Source mode: show toggle button + source line styling
        const sourceToggleWidget = createCodeBlockSourceToggleWidget(
          node.from,
          node.to
        );
        decorations.push(
          Decoration.widget({ widget: sourceToggleWidget, block: true }).range(
            node.from
          )
        );

        for (let pos = node.from; pos <= node.to; ) {
          const line = state.doc.lineAt(pos);
          decorations.push(
            Decoration.line({ class: 'cm-codeblock-source' }).range(line.from)
          );
          pos = line.to + 1;
        }
      } else {
        // Render mode (inline): replace fences, keep code content editable

        const openFenceLine = state.doc.lineAt(node.from);
        const closeFenceLine = state.doc.lineAt(node.to);

        // 1. Replace opening fence line with header widget.
        //    Use inclusiveEnd so the cursor cannot land between
        //    the header and the first content line.
        const headerWidget = new CodeBlockHeaderWidget(
          language,
          code,
          node.from,
          node.to,
          options.copyButton
        );
        decorations.push(
          Decoration.replace({
            widget: headerWidget,
            block: true,
            inclusiveEnd: true,
          }).range(openFenceLine.from, openFenceLine.to)
        );

        // 2. Line decorations for every content line between fences
        for (
          let lineNum = openFenceLine.number + 1;
          lineNum < closeFenceLine.number;
          lineNum++
        ) {
          const line = state.doc.line(lineNum);
          decorations.push(
            Decoration.line({ class: 'cm-codeblock-content' }).range(line.from)
          );
        }

        // 3. Mark decorations for syntax highlighting (from hast)
        if (codeText && code) {
          const hast = highlightCodeHast(code, language || undefined);
          if (hast) {
            const marks = hastToMarkDecorations(hast as HastNode, codeText.from);
            for (const mark of marks) {
              if (mark.from >= 0 && mark.to <= state.doc.length) {
                decorations.push(mark);
              }
            }
          }
        }

        // 4. Replace closing fence line with footer widget.
        //    Use inclusiveStart so the cursor cannot land between
        //    the last content line and the footer.
        const footerWidget = new CodeBlockFooterWidget();
        decorations.push(
          Decoration.replace({
            widget: footerWidget,
            block: true,
            inclusiveStart: true,
          }).range(closeFenceLine.from, closeFenceLine.to)
        );
      }
    },
  });

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

// ─── Build standard decorations (auto/toggle) ────────────────────────

/**
 * Build code block decorations for auto/toggle mode
 */
function buildCodeBlockDecorations(
  state: EditorState,
  options: Required<CodeBlockOptions>
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const isAutoInteraction = options.interaction === 'auto';
  const isDrag = isAutoInteraction ? state.field(mouseSelectingField, false) : false;
  const sourceRanges = state.field(codeBlockSourceModeField);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'FencedCode') {
        // Get language info
        const codeInfo = node.node.getChild('CodeInfo');
        let language = options.defaultLanguage;

        if (codeInfo) {
          language = state.doc.sliceString(codeInfo.from, codeInfo.to).trim();
        }

        // Skip special languages (like math)
        if (SKIP_LANGUAGES.has(language)) {
          return;
        }

        // Get code content
        const codeText = node.node.getChild('CodeText');
        const code = codeText
          ? state.doc.sliceString(codeText.from, codeText.to)
          : '';
        const codeFrom = codeText ? codeText.from : node.from;

        // Calculate start position of each line
        const lineStarts: number[] = [];
        if (codeText) {
          const startPos = codeText.from;
          lineStarts.push(startPos);
          for (let i = 0; i < code.length; i++) {
            if (code[i] === '\n') {
              lineStarts.push(startPos + i + 1);
            }
          }
        }

        const showSource =
          options.interaction === 'toggle'
            ? isCodeBlockInSourceMode(sourceRanges, node.from, node.to)
            : shouldShowSource(state, node.from, node.to) || isDrag;

        if (!showSource) {
          // Render mode: show widget
          const widget = createCodeBlockWidget({
            code,
            language,
            showLineNumbers: options.lineNumbers,
            showCopyButton: options.copyButton,
            showSourceToggle: options.interaction === 'toggle',
            from: node.from,
            to: node.to,
            codeFrom,
            lineStarts,
          });

          decorations.push(
            Decoration.replace({ widget, block: true }).range(node.from, node.to)
          );
        } else {
          if (options.interaction === 'toggle') {
            const sourceToggleWidget = createCodeBlockSourceToggleWidget(
              node.from,
              node.to
            );
            decorations.push(
              Decoration.widget({ widget: sourceToggleWidget, block: true }).range(
                node.from
              )
            );
          }

          // Source mode: add background to each line
          for (let pos = node.from; pos <= node.to; ) {
            const line = state.doc.lineAt(pos);
            decorations.push(
              Decoration.line({ class: 'cm-codeblock-source' }).range(line.from)
            );
            pos = line.to + 1;
          }
        }
      }
    },
  });

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

/**
 * Create code block StateField
 */
function createCodeBlockField(
  options: Required<CodeBlockOptions>
): StateField<DecorationSet> {
  const isInline = options.interaction === 'inline';
  const buildFn = isInline ? buildCodeBlockInlineDecorations : buildCodeBlockDecorations;

  return StateField.define<DecorationSet>({
    create(state) {
      return buildFn(state, options);
    },

    update(deco, tr) {
      // Rebuild on document or config change
      if (
        tr.docChanged ||
        tr.reconfigured ||
        tr.effects.some((effect) => effect.is(setCodeBlockSourceMode))
      ) {
        return buildFn(tr.state, options);
      }

      // Inline and toggle modes: don't rebuild on selection change
      if (options.interaction !== 'auto') {
        return deco;
      }

      // Rebuild on drag state change
      const isDragging = tr.state.field(mouseSelectingField, false);
      const wasDragging = tr.startState.field(mouseSelectingField, false);

      if (wasDragging && !isDragging) {
        return buildFn(tr.state, options);
      }

      // Keep unchanged during drag
      if (isDragging) {
        return deco;
      }

      // Rebuild on selection change
      if (tr.selection) {
        return buildFn(tr.state, options);
      }

      return deco;
    },

    provide: (f) => EditorView.decorations.from(f),
  });
}

/**
 * Code block plugin
 *
 * @param options - Configuration options
 * @returns Extension array (StateField + click handler)
 *
 * @example
 * ```typescript
 * import { codeBlockField } from 'codemirror-live-markdown';
 *
 * // Use default config
 * extensions: [codeBlockField()]
 *
 * // Custom config
 * extensions: [codeBlockField({
 *   lineNumbers: true,
 *   copyButton: true,
 *   defaultLanguage: 'javascript',
 * })]
 *
 * // Inline mode (editable in-place)
 * extensions: [codeBlockField({
 *   interaction: 'inline',
 *   copyButton: true,
 * })]
 * ```
 */
/**
 * drawSelection() hides native ::selection on all .cm-line elements using
 * Prec.highest.  In inline mode the code-block content lines have an opaque
 * background that also covers drawSelection's selectionLayer (z-index:-1).
 * Re-enable native ::selection specifically for .cm-codeblock-content using
 * Prec.highest + higher CSS specificity so selection is visible again.
 *
 * Uses an explicit RGBA color instead of the 'Highlight' CSS system keyword
 * because Tauri/WebKit may not resolve 'Highlight' to a visible color.
 * Consumers can override via --cm-codeblock-selection CSS custom property.
 */
const inlineSelectionFix = Prec.highest(
  EditorView.theme({
    '.cm-line.cm-codeblock-content': {
      '&::selection, & ::selection': {
        backgroundColor:
          'var(--cm-codeblock-selection, rgba(128, 188, 254, 0.4)) !important',
      },
    },
  }),
);

export function codeBlockField(options?: CodeBlockOptions) {
  const mergedOptions = { ...defaultOptions, ...options };

  const field = createCodeBlockField(mergedOptions);

  const extensions = [codeBlockSourceModeField, field];
  if (mergedOptions.interaction === 'inline') {
    extensions.push(inlineSelectionFix);
  }
  return extensions;
}

export function codeBlockEditorPlugin(options?: CodeBlockEditorOptions) {
  return codeBlockField({
    ...options,
    interaction: 'toggle',
  });
}

export { setCodeBlockSourceMode };
