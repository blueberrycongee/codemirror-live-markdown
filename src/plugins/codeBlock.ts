/**
 * 代码块插件
 *
 * 实现 Markdown 代码块的语法高亮预览
 * 光标不在代码块内时显示渲染结果，进入时显示源码
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import { createCodeBlockWidget } from '../widgets/codeBlockWidget';

/**
 * 代码块插件配置
 */
export interface CodeBlockOptions {
  /** 是否显示行号，默认 false */
  lineNumbers?: boolean;
  /** 是否显示复制按钮，默认 true */
  copyButton?: boolean;
  /** 默认语言，默认 'text' */
  defaultLanguage?: string;
}

const defaultOptions: Required<CodeBlockOptions> = {
  lineNumbers: false,
  copyButton: true,
  defaultLanguage: 'text',
};

/**
 * 需要跳过的语言（由其他插件处理）
 */
const SKIP_LANGUAGES = new Set(['math']);

/**
 * 构建代码块装饰
 */
function buildCodeBlockDecorations(
  state: EditorState,
  options: Required<CodeBlockOptions>
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const isDrag = state.field(mouseSelectingField, false);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'FencedCode') {
        // 获取语言信息
        const codeInfo = node.node.getChild('CodeInfo');
        let language = options.defaultLanguage;

        if (codeInfo) {
          language = state.doc.sliceString(codeInfo.from, codeInfo.to).trim();
        }

        // 跳过特殊语言（如 math）
        if (SKIP_LANGUAGES.has(language)) {
          return;
        }

        // 获取代码内容
        const codeText = node.node.getChild('CodeText');
        const code = codeText
          ? state.doc.sliceString(codeText.from, codeText.to)
          : '';

        // 决定显示模式
        const isTouched = shouldShowSource(state, node.from, node.to);

        if (!isTouched && !isDrag) {
          // 渲染模式：显示 Widget
          const widget = createCodeBlockWidget({
            code,
            language,
            showLineNumbers: options.lineNumbers,
            showCopyButton: options.copyButton,
            from: node.from,
            codeFrom: codeText?.from ?? node.from,
          });

          decorations.push(
            Decoration.replace({ widget, block: true }).range(node.from, node.to)
          );
        } else {
          // 编辑模式：为每一行添加背景色
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
 * 代码块点击处理 ViewPlugin
 *
 * 处理点击代码块 Widget 时的光标定位
 */
const codeBlockClickHandler = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      this.handleClick = this.handleClick.bind(this);
      view.contentDOM.addEventListener('mousedown', this.handleClick);
    }

    handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // 检查是否点击了代码块 Widget 内的行
      const line = target.closest('.line');
      if (!line) return;

      const widget = target.closest('.cm-codeblock-widget');
      if (!widget) return;

      // 获取代码起始位置和行偏移
      const codeFrom = parseInt(
        (widget as HTMLElement).dataset.codeFrom || '0',
        10
      );
      const lineOffset = parseInt(
        (line as HTMLElement).dataset.offset || '0',
        10
      );

      if (isNaN(codeFrom) || isNaN(lineOffset)) return;

      // 计算目标位置
      const targetPos = codeFrom + lineOffset;

      // 延迟设置光标位置，让 CodeMirror 先处理完点击事件
      requestAnimationFrame(() => {
        // 确保位置在文档范围内
        const docLength = this.view.state.doc.length;
        const safePos = Math.min(Math.max(0, targetPos), docLength);

        this.view.dispatch({
          selection: { anchor: safePos },
          scrollIntoView: true,
        });
      });
    }

    update(_update: ViewUpdate) {
      // 不需要在更新时做任何事
    }

    destroy() {
      this.view.contentDOM.removeEventListener('mousedown', this.handleClick);
    }
  }
);

/**
 * 创建代码块 StateField
 */
function createCodeBlockField(options: Required<CodeBlockOptions>): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildCodeBlockDecorations(state, options);
    },

    update(deco, tr) {
      // 文档变化或重新配置时重建
      if (tr.docChanged || tr.reconfigured) {
        return buildCodeBlockDecorations(tr.state, options);
      }

      // 拖拽状态变化时重建
      const isDragging = tr.state.field(mouseSelectingField, false);
      const wasDragging = tr.startState.field(mouseSelectingField, false);

      if (wasDragging && !isDragging) {
        return buildCodeBlockDecorations(tr.state, options);
      }

      // 拖拽中保持不变
      if (isDragging) {
        return deco;
      }

      // 选区变化时重建
      if (tr.selection) {
        return buildCodeBlockDecorations(tr.state, options);
      }

      return deco;
    },

    provide: (f) => EditorView.decorations.from(f),
  });
}

// 缓存 StateField 实例
let cachedField: StateField<DecorationSet> | null = null;
let cachedOptions: Required<CodeBlockOptions> | null = null;

/**
 * 代码块插件
 *
 * @param options - 配置选项
 * @returns Extension 数组（包含 StateField 和点击处理 ViewPlugin）
 *
 * @example
 * ```typescript
 * import { codeBlockField } from 'codemirror-live-markdown';
 *
 * // 使用默认配置
 * extensions: [codeBlockField()]
 *
 * // 自定义配置
 * extensions: [codeBlockField({
 *   lineNumbers: true,
 *   copyButton: true,
 *   defaultLanguage: 'javascript',
 * })]
 * ```
 */
export function codeBlockField(options?: CodeBlockOptions) {
  const mergedOptions = { ...defaultOptions, ...options };

  // 检查是否可以复用缓存
  if (
    cachedField &&
    cachedOptions &&
    cachedOptions.lineNumbers === mergedOptions.lineNumbers &&
    cachedOptions.copyButton === mergedOptions.copyButton &&
    cachedOptions.defaultLanguage === mergedOptions.defaultLanguage
  ) {
    return [cachedField, codeBlockClickHandler];
  }

  // 创建新的 StateField
  cachedField = createCodeBlockField(mergedOptions);
  cachedOptions = mergedOptions;

  return [cachedField, codeBlockClickHandler];
}
