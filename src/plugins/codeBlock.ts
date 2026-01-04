/**
 * 代码块插件
 *
 * 实现 Markdown 代码块的语法高亮预览
 * 光标不在代码块内时显示渲染结果，进入时显示源码
 * 支持精确的点击位置映射
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
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
        const codeFrom = codeText ? codeText.from : node.from;

        // 计算每行的起始位置
        const lineStarts: number[] = [];
        if (codeText) {
          let pos = codeText.from;
          lineStarts.push(pos);
          for (let i = 0; i < code.length; i++) {
            if (code[i] === '\n') {
              lineStarts.push(pos + i + 1);
            }
          }
        }

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
            to: node.to,
            codeFrom,
            lineStarts,
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
 * 创建代码块点击处理器
 */
function createCodeBlockClickHandler() {
  return EditorView.domEventHandlers({
    // 监听自定义事件（来自 Widget）
    'codeblock-click': (event: Event, view) => {
      const customEvent = event as CustomEvent<{ targetPos: number }>;
      const targetPos = customEvent.detail.targetPos;

      console.log(
        '[CodeBlock Handler] codeblock-click received, targetPos:',
        targetPos
      );

      // 设置光标位置
      view.dispatch({
        selection: { anchor: targetPos },
        scrollIntoView: true,
      });

      // 聚焦编辑器
      view.focus();

      return true;
    },

    // 调试：监听源码模式下的 mousedown
    mousedown: (event: MouseEvent, view) => {
      const target = event.target as HTMLElement;

      // 检查是否点击在代码块源码区域
      const sourceLine = target.closest('.cm-codeblock-source');
      if (!sourceLine) {
        return false; // 不是代码块，让 CodeMirror 默认处理
      }

      // 获取点击坐标
      const { clientX, clientY } = event;

      // 使用 CodeMirror 的 posAtCoords 计算位置
      const cmPos = view.posAtCoords({ x: clientX, y: clientY });

      // 获取点击位置的行信息
      const line = sourceLine.closest('.cm-line');
      const lineRect = line?.getBoundingClientRect();

      // 获取行内的文本内容
      const lineText = line?.textContent || '';

      // 计算相对于行的点击位置
      const relativeX = lineRect ? clientX - lineRect.left : 0;

      // 获取计算样式
      const style = line ? window.getComputedStyle(line) : null;
      const paddingLeft = style ? parseFloat(style.paddingLeft) : 0;
      const fontSize = style ? parseFloat(style.fontSize) : 16;
      const fontFamily = style?.fontFamily || 'monospace';

      // 使用 Canvas 测量预期位置
      let expectedCharOffset = 0;
      const textX = relativeX - paddingLeft;
      if (textX > 0) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${fontSize}px ${fontFamily}`;
          for (let i = 0; i <= lineText.length; i++) {
            const width = ctx.measureText(lineText.substring(0, i)).width;
            if (width > textX) break;
            expectedCharOffset = i;
          }
        }
      }

      // 获取行的文档位置
      let lineDocPos = 0;
      if (line) {
        const linePos = view.posAtDOM(line);
        if (linePos !== null) {
          lineDocPos = linePos;
        }
      }

      const expectedPos = lineDocPos + expectedCharOffset;

      console.log('[CodeBlock Debug] Source mode mousedown:', {
        clientX,
        clientY,
        cmPos,
        expectedPos,
        diff: cmPos !== null ? cmPos - expectedPos : 'N/A',
        lineText: lineText.substring(0, 50) + (lineText.length > 50 ? '...' : ''),
        lineDocPos,
        relativeX,
        paddingLeft,
        textX,
        expectedCharOffset,
        fontSize,
        fontFamily: fontFamily.substring(0, 50),
      });

      // 不拦截事件，让 CodeMirror 继续处理
      // 这样我们可以看到 CodeMirror 实际设置的位置
      return false;
    },
  });
}

/**
 * 创建代码块 StateField
 */
function createCodeBlockField(
  options: Required<CodeBlockOptions>
): StateField<DecorationSet> {
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

// 缓存 StateField 实例（暂时禁用）
// let cachedField: StateField<DecorationSet> | null = null;
// let cachedOptions: Required<CodeBlockOptions> | null = null;
// let cachedClickHandler: ReturnType<typeof createCodeBlockClickHandler> | null = null;

/**
 * 代码块插件
 *
 * @param options - 配置选项
 * @returns Extension 数组（StateField + 点击处理器）
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

  // 暂时禁用缓存以便调试
  // 创建新的 StateField 和点击处理器
  const field = createCodeBlockField(mergedOptions);
  const clickHandler = createCodeBlockClickHandler();

  console.log('[CodeBlock] Creating new field and click handler');

  return [field, clickHandler];
}
