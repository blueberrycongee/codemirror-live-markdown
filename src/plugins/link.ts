/**
 * 链接插件
 *
 * 实现 Markdown 链接的实时预览
 * 光标不在链接内时隐藏 URL 部分，只显示链接文本
 * 支持标准链接和 Wiki 链接
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
 * 解析标准链接语法
 *
 * @param text - 链接语法文本
 * @returns 解析后的链接数据，或 null
 */
export function parseLinkSyntax(text: string): LinkData | null {
  // 排除图片语法
  if (text.startsWith('!')) {
    return null;
  }

  // 匹配 [text](url) 或 [text](url "title") 或 [text](url 'title')
  const match = text.match(
    /^\[([^\]]*)\]\((.+?)(?:\s+["']([^"']+)["'])?\)$/
  );

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
 * 解析 Wiki 链接语法
 *
 * @param text - Wiki 链接语法文本
 * @returns 解析后的链接数据，或 null
 */
export function parseWikiLink(text: string): LinkData | null {
  // 匹配 [[target]] 或 [[target|display]]
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
 * Wiki 链接正则表达式
 */
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * 默认选项
 */
const defaultOptions: Required<LinkOptions> = {
  openInNewTab: true,
  onWikiLinkClick: undefined as unknown as (link: string) => void,
  showPreview: false,
};

/**
 * 需要跳过的父节点类型（这些区域由其他插件处理）
 */
const SKIP_PARENT_TYPES = new Set([
  'FencedCode',
  'CodeBlock',
  'InlineCode',
]);

/**
 * 构建链接装饰
 */
function buildLinkDecorations(
  view: EditorView,
  options: Required<LinkOptions>
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const state = view.state;
  const isDrag = state.field(mouseSelectingField, false);

  // 收集需要跳过的区域（代码块、行内代码等）
  const skipRanges: Array<{ from: number; to: number }> = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (SKIP_PARENT_TYPES.has(node.name)) {
        skipRanges.push({ from: node.from, to: node.to });
      }
    },
  });

  // 检查位置是否在跳过区域内
  const isInSkipRange = (from: number, to: number) => {
    return skipRanges.some((r) => from >= r.from && to <= r.to);
  };

  // 处理标准链接
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Link') {
        // 跳过代码块内的链接
        if (isInSkipRange(node.from, node.to)) {
          return;
        }
        const from = node.from;
        const to = node.to;

        // 获取链接语法文本
        const text = state.doc.sliceString(from, to);
        const linkData = parseLinkSyntax(text);

        if (!linkData) {
          return;
        }

        // 决定显示模式
        const isTouched = shouldShowSource(state, from, to);

        if (!isTouched && !isDrag) {
          // 渲染模式：显示 Widget
          const widget = createLinkWidget(linkData, options);

          decorations.push(
            Decoration.replace({ widget }).range(from, to)
          );
        } else {
          // 编辑模式：添加背景色标记
          decorations.push(
            Decoration.mark({ class: 'cm-link-source' }).range(from, to)
          );
        }
      }
    },
  });

  // 处理 Wiki 链接（Lezer 默认不支持，需要手动匹配）
  const docText = state.doc.toString();
  let match: RegExpExecArray | null;

  // 重置正则表达式
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;

    // 跳过代码块内的 Wiki 链接
    if (isInSkipRange(from, to)) {
      continue;
    }

    const wikiData = parseWikiLink(match[0]);
    if (!wikiData) {
      continue;
    }

    // 决定显示模式
    const isTouched = shouldShowSource(state, from, to);

    if (!isTouched && !isDrag) {
      // 渲染模式：显示 Widget
      const widget = createLinkWidget(wikiData, options);

      decorations.push(
        Decoration.replace({ widget }).range(from, to)
      );
    } else {
      // 编辑模式：添加背景色标记
      decorations.push(
        Decoration.mark({ class: 'cm-link-source cm-wikilink-source' }).range(from, to)
      );
    }
  }

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

/**
 * 链接插件
 *
 * @param options - 配置选项
 * @returns ViewPlugin
 *
 * @example
 * ```typescript
 * import { linkPlugin } from 'codemirror-live-markdown';
 *
 * // 使用默认配置
 * extensions: [linkPlugin()]
 *
 * // 自定义配置
 * extensions: [linkPlugin({
 *   openInNewTab: true,
 *   onWikiLinkClick: (link) => {
 *     router.push(`/wiki/${link}`);
 *   },
 * })]
 * ```
 */
export function linkPlugin(options?: LinkOptions): ViewPlugin<{
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
        // 文档变化或重新配置时重建
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildLinkDecorations(update.view, mergedOptions);
          return;
        }

        // 拖拽状态变化时重建
        const isDragging = update.state.field(mouseSelectingField, false);
        const wasDragging = update.startState.field(mouseSelectingField, false);

        if (wasDragging && !isDragging) {
          this.decorations = buildLinkDecorations(update.view, mergedOptions);
          return;
        }

        // 拖拽中保持不变
        if (isDragging) {
          return;
        }

        // 选区变化时重建
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
