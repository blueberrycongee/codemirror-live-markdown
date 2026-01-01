import { syntaxTree } from '@codemirror/language';
import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

/**
 * Markdown 样式插件
 * 
 * 负责给 Markdown 元素应用样式（标题大小、粗体、斜体等）
 * 
 * 注意：这个插件只负责样式应用，不处理标记的显示/隐藏
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

      // 样式映射表
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
          if (cls) {
            decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));

            // 标题还需要行级装饰
            if (node.name.startsWith('ATXHeading')) {
              decorations.push(Decoration.line({ class: 'cm-heading-line' }).range(node.from));
            }
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
