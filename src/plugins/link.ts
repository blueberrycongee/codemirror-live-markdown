/**
 * Link Plugin
 *
 * Implements live preview for Markdown links
 * Hides URL part when cursor is outside link, shows only link text
 * Supports standard links and Wiki links
 */

import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import { createLinkWidget, LinkData, LinkOptions } from '../widgets/linkWidget';

export type { LinkOptions } from '../widgets/linkWidget';

/**
 * Parse standard link syntax
 *
 * @param text - Link syntax text
 * @returns Parsed link data, or null
 */
export function parseLinkSyntax(text: string): LinkData | null {
  // Exclude image syntax
  if (text.startsWith('!')) {
    return null;
  }

  // Match [text](url) or [text](url "title") or [text](url 'title')
  const match = text.match(/^\[([^\]]*)\]\((.+?)(?:\s+["']([^"']+)["'])?\)$/);

  if (!match) {
    return null;
  }

  const [, linkText, url, title] = match;

  return {
    text: linkText,
    url,
    title,
    isWikiLink: false,
  };
}

/**
 * Parse Wiki link syntax
 *
 * @param text - Wiki link syntax text
 * @returns Parsed link data, or null
 */
export function parseWikiLink(text: string): LinkData | null {
  // Match [[target]] or [[target|display]]
  const match = text.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);

  if (!match) {
    return null;
  }

  const [, target, display] = match;

  return {
    text: display || target,
    url: target,
    isWikiLink: true,
  };
}

/**
 * Wiki link regex
 */
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * Default options
 */
const defaultOptions: Required<LinkOptions> = {
  openInNewTab: true,
  onWikiLinkClick: undefined as unknown as (link: string) => void,
  showPreview: false,
};

/**
 * Parent node types to skip (handled by other plugins)
 */
const SKIP_PARENT_TYPES = new Set(['FencedCode', 'CodeBlock', 'InlineCode']);

/**
 * Build link decorations
 */
function buildLinkDecorations(
  view: EditorView,
  options: Required<LinkOptions>
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const state = view.state;
  const isDrag = state.field(mouseSelectingField, false);

  // Collect ranges to skip (code blocks, inline code, etc.)
  const skipRanges: Array<{ from: number; to: number }> = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (SKIP_PARENT_TYPES.has(node.name)) {
        skipRanges.push({ from: node.from, to: node.to });
      }
    },
  });

  // Check if position is in skip range
  const isInSkipRange = (from: number, to: number) => {
    return skipRanges.some((r) => from >= r.from && to <= r.to);
  };

  // Process standard links
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Link') {
        // Skip links inside code blocks
        if (isInSkipRange(node.from, node.to)) {
          return;
        }
        const from = node.from;
        const to = node.to;

        // Get link syntax text
        const text = state.doc.sliceString(from, to);
        const linkData = parseLinkSyntax(text);

        if (!linkData) {
          return;
        }

        // Decide display mode
        const isTouched = shouldShowSource(state, from, to);

        if (!isTouched && !isDrag) {
          // Render mode: show widget
          const widget = createLinkWidget(linkData, options);

          decorations.push(Decoration.replace({ widget }).range(from, to));
        } else {
          // Edit mode: add background mark
          decorations.push(
            Decoration.mark({ class: 'cm-link-source' }).range(from, to)
          );
        }
      }
    },
  });

  // Process Wiki links (Lezer doesn't support by default, need manual matching)
  const docText = state.doc.toString();
  let match: RegExpExecArray | null;

  // Reset regex
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;

    // Skip Wiki links inside code blocks
    if (isInSkipRange(from, to)) {
      continue;
    }

    const wikiData = parseWikiLink(match[0]);
    if (!wikiData) {
      continue;
    }

    // Decide display mode
    const isTouched = shouldShowSource(state, from, to);

    if (!isTouched && !isDrag) {
      // Render mode: show widget
      const widget = createLinkWidget(wikiData, options);

      decorations.push(Decoration.replace({ widget }).range(from, to));
    } else {
      // Edit mode: add background mark
      decorations.push(
        Decoration.mark({ class: 'cm-link-source cm-wikilink-source' }).range(
          from,
          to
        )
      );
    }
  }

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

/**
 * Link plugin
 *
 * @param options - Configuration options
 * @returns ViewPlugin
 *
 * @example
 * ```typescript
 * import { linkPlugin } from 'codemirror-live-markdown';
 *
 * // Use default config
 * extensions: [linkPlugin()]
 *
 * // Custom config
 * extensions: [linkPlugin({
 *   openInNewTab: true,
 *   onWikiLinkClick: (link) => {
 *     router.push(`/wiki/${link}`);
 *   },
 * })]
 * ```
 */
export function linkPlugin(
  options?: LinkOptions
): ViewPlugin<{
  decorations: DecorationSet;
  update(update: ViewUpdate): void;
}> {
  const mergedOptions = { ...defaultOptions, ...options };

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildLinkDecorations(view, mergedOptions);
      }

      update(update: ViewUpdate) {
        // Rebuild on document or config change
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildLinkDecorations(update.view, mergedOptions);
          return;
        }

        // Rebuild on drag state change
        const isDragging = update.state.field(mouseSelectingField, false);
        const wasDragging = update.startState.field(mouseSelectingField, false);

        if (wasDragging && !isDragging) {
          this.decorations = buildLinkDecorations(update.view, mergedOptions);
          return;
        }

        // Keep unchanged during drag
        if (isDragging) {
          return;
        }

        // Rebuild on selection change
        if (update.selectionSet) {
          this.decorations = buildLinkDecorations(update.view, mergedOptions);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
