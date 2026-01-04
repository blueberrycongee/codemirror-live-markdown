/**
 * 图片插件
 *
 * 实现 Markdown 图片的实时预览
 * 光标不在图片语法内时显示图片预览，进入时显示源码
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import { createImageWidget, ImageData, ImageOptions } from '../widgets/imageWidget';

export type { ImageOptions } from '../widgets/imageWidget';

/**
 * 解析图片语法
 *
 * @param text - 图片语法文本
 * @returns 解析后的图片数据，或 null
 */
export function parseImageSyntax(text: string): ImageData | null {
  // 匹配 ![alt](url) 或 ![alt](url "title") 或 ![alt](url 'title')
  // URL 部分支持括号（使用贪婪匹配到最后一个括号前）
  const match = text.match(
    /^!\[([^\]]*)\]\((.+?)(?:\s+["']([^"']+)["'])?\)$/
  );

  if (!match) {
    return null;
  }

  const [, alt, src, title] = match;

  // 判断是否为本地图片
  const isLocal = !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:');

  return {
    src,
    alt,
    title,
    isLocal,
  };
}

/**
 * 默认选项
 */
const defaultOptions: Required<ImageOptions> = {
  maxWidth: '100%',
  showAlt: true,
  showLoading: true,
  errorPlaceholder: 'Failed to load image',
  basePath: '',
};

/**
 * 构建图片装饰
 */
function buildImageDecorations(
  state: EditorState,
  options: Required<ImageOptions>
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const isDrag = state.field(mouseSelectingField, false);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Image') {
        const from = node.from;
        const to = node.to;

        // 获取图片语法文本
        const text = state.doc.sliceString(from, to);
        const imageData = parseImageSyntax(text);

        if (!imageData) {
          return;
        }

        // 决定显示模式
        const isTouched = shouldShowSource(state, from, to);

        if (!isTouched && !isDrag) {
          // 渲染模式：显示 Widget
          const widget = createImageWidget(imageData, options);

          decorations.push(
            Decoration.replace({ widget, block: true }).range(from, to)
          );
        } else {
          // 编辑模式：为图片所在行添加背景色
          const line = state.doc.lineAt(from);
          decorations.push(
            Decoration.line({ class: 'cm-image-source' }).range(line.from)
          );
        }
      }
    },
  });

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

/**
 * 创建图片 StateField
 */
function createImageField(options: Required<ImageOptions>): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildImageDecorations(state, options);
    },

    update(deco, tr) {
      // 文档变化或重新配置时重建
      if (tr.docChanged || tr.reconfigured) {
        return buildImageDecorations(tr.state, options);
      }

      // 拖拽状态变化时重建
      const isDragging = tr.state.field(mouseSelectingField, false);
      const wasDragging = tr.startState.field(mouseSelectingField, false);

      if (wasDragging && !isDragging) {
        return buildImageDecorations(tr.state, options);
      }

      // 拖拽中保持不变
      if (isDragging) {
        return deco;
      }

      // 选区变化时重建
      if (tr.selection) {
        return buildImageDecorations(tr.state, options);
      }

      return deco;
    },

    provide: (f) => EditorView.decorations.from(f),
  });
}

// 缓存 StateField 实例
let cachedField: StateField<DecorationSet> | null = null;
let cachedOptions: Required<ImageOptions> | null = null;

/**
 * 图片插件
 *
 * @param options - 配置选项
 * @returns StateField
 *
 * @example
 * ```typescript
 * import { imageField } from 'codemirror-live-markdown';
 *
 * // 使用默认配置
 * extensions: [imageField()]
 *
 * // 自定义配置
 * extensions: [imageField({
 *   maxWidth: '600px',
 *   showAlt: true,
 *   basePath: '/assets/images/',
 * })]
 * ```
 */
export function imageField(options?: ImageOptions): StateField<DecorationSet> {
  const mergedOptions = { ...defaultOptions, ...options };

  // 检查是否可以复用缓存
  if (
    cachedField &&
    cachedOptions &&
    cachedOptions.maxWidth === mergedOptions.maxWidth &&
    cachedOptions.showAlt === mergedOptions.showAlt &&
    cachedOptions.showLoading === mergedOptions.showLoading &&
    cachedOptions.errorPlaceholder === mergedOptions.errorPlaceholder &&
    cachedOptions.basePath === mergedOptions.basePath
  ) {
    return cachedField;
  }

  // 创建新的 StateField
  cachedField = createImageField(mergedOptions);
  cachedOptions = mergedOptions;

  return cachedField;
}
