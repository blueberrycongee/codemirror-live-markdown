import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';

/**
 * Parent node types to skip
 */
const SKIP_PARENT_TYPES = new Set(['FencedCode', 'CodeBlock']);

/**
 * Check if node is inside a skipped parent
 */
function isInsideSkippedParent(node: {
  node: { parent: { name: string; parent: unknown } | null };
}): boolean {
  let parent = node.node.parent;
  while (parent) {
    if (SKIP_PARENT_TYPES.has(parent.name)) {
      return true;
    }
    parent = parent.parent as { name: string; parent: unknown } | null;
  }
  return false;
}

/**
 * Markdown Style Plugin
 *
 * Applies styles to Markdown elements (heading sizes, bold, italic, etc.)
 *
 * Note: This plugin only handles style application, not mark show/hide
 */
export const markdownStylePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView) {
      const decorations: Range<Decoration>[] = [];

      // Style mapping table
      const styleMap: Record<string, string> = {
        ATXHeading1: 'cm-header-1',
        ATXHeading2: 'cm-header-2',
        ATXHeading3: 'cm-header-3',
        ATXHeading4: 'cm-header-4',
        ATXHeading5: 'cm-header-5',
        ATXHeading6: 'cm-header-6',
        StrongEmphasis: 'cm-strong',
        Emphasis: 'cm-emphasis',
        Strikethrough: 'cm-strikethrough',
        InlineCode: 'cm-code',
        Link: 'cm-link',
      };

      syntaxTree(view.state).iterate({
        enter: (node) => {
          const cls = styleMap[node.name];
          if (!cls) return;

          // Skip nodes inside code blocks
          if (isInsideSkippedParent(node)) {
            return;
          }

          decorations.push(
            Decoration.mark({ class: cls }).range(node.from, node.to)
          );

          // Headings also need line-level decoration
          if (node.name.startsWith('ATXHeading')) {
            decorations.push(
              Decoration.line({ class: 'cm-heading-line' }).range(node.from)
            );
          }
        },
      });

      return Decoration.set(decorations, true);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
