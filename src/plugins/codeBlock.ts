/**
 * Code Block Plugin
 *
 * Implements syntax highlighting preview for Markdown code blocks
 * Shows rendered result when cursor is outside code block, shows source when inside
 * Supports precise click position mapping
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import {
  createCodeBlockSourceToggleWidget,
  createCodeBlockWidget,
} from '../widgets/codeBlockWidget';
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
  /** Interaction mode: auto follows cursor, toggle uses explicit button */
  interaction?: 'auto' | 'toggle';
}

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

/**
 * Build code block decorations
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
 * Create code block click handler
 */
function createCodeBlockClickHandler() {
  return EditorView.domEventHandlers({
    // Listen for custom event (from widget)
    'codeblock-click': (event: Event, view) => {
      const customEvent = event as CustomEvent<{ targetPos: number }>;
      const targetPos = customEvent.detail.targetPos;

      // Set cursor position
      view.dispatch({
        selection: { anchor: targetPos },
        scrollIntoView: true,
      });

      // Focus editor
      view.focus();

      return true;
    },
    'codeblock-toggle-source': (event: Event, view) => {
      const customEvent = event as CustomEvent<CodeBlockSourceModeToggle>;
      const payload = customEvent.detail;

      view.dispatch({
        selection: payload.showSource ? { anchor: payload.from } : undefined,
        effects: setCodeBlockSourceMode.of(payload),
        scrollIntoView: true,
      });

      view.focus();
      return true;
    },
  });
}

/**
 * Create code block StateField
 */
function createCodeBlockField(
  options: Required<CodeBlockOptions>
): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildCodeBlockDecorations(state, options);
    },

    update(deco, tr) {
      // Rebuild on document or config change
      if (
        tr.docChanged ||
        tr.reconfigured ||
        tr.effects.some((effect) => effect.is(setCodeBlockSourceMode))
      ) {
        return buildCodeBlockDecorations(tr.state, options);
      }

      if (options.interaction !== 'auto') {
        return deco;
      }

      // Rebuild on drag state change
      const isDragging = tr.state.field(mouseSelectingField, false);
      const wasDragging = tr.startState.field(mouseSelectingField, false);

      if (wasDragging && !isDragging) {
        return buildCodeBlockDecorations(tr.state, options);
      }

      // Keep unchanged during drag
      if (isDragging) {
        return deco;
      }

      // Rebuild on selection change
      if (tr.selection) {
        return buildCodeBlockDecorations(tr.state, options);
      }

      return deco;
    },

    provide: (f) => EditorView.decorations.from(f),
  });
}

// Cache StateField instance (temporarily disabled)
// let cachedField: StateField<DecorationSet> | null = null;
// let cachedOptions: Required<CodeBlockOptions> | null = null;
// let cachedClickHandler: ReturnType<typeof createCodeBlockClickHandler> | null = null;

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
 * ```
 */
export function codeBlockField(options?: CodeBlockOptions) {
  const mergedOptions = { ...defaultOptions, ...options };

  const field = createCodeBlockField(mergedOptions);
  const clickHandler = createCodeBlockClickHandler();

  return [codeBlockSourceModeField, field, clickHandler];
}

export { setCodeBlockSourceMode };
