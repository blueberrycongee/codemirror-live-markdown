/**
 * 代码块 Widget
 *
 * 渲染语法高亮的代码块，支持复制按钮和行号
 * 支持精确的点击位置映射
 */

import { WidgetType } from '@codemirror/view';
import { highlightCode } from '../utils/codeHighlight';

/**
 * 代码块数据接口
 */
export interface CodeBlockData {
  /** 源代码 */
  code: string;
  /** 语言标识 */
  language: string;
  /** 是否显示行号 */
  showLineNumbers: boolean;
  /** 是否显示复制按钮 */
  showCopyButton: boolean;
  /** 代码块在文档中的起始位置 */
  from: number;
  /** 代码块在文档中的结束位置 */
  to: number;
  /** 代码内容的起始位置（跳过 ```language） */
  codeFrom: number;
  /** 每行的起始位置（相对于文档） */
  lineStarts: number[];
}

/**
 * 代码块 Widget 类
 */
export class CodeBlockWidget extends WidgetType {
  constructor(readonly data: CodeBlockData) {
    super();
  }

  /**
   * 判断两个 Widget 是否相等
   */
  eq(other: CodeBlockWidget): boolean {
    return (
      other.data.code === this.data.code &&
      other.data.language === this.data.language &&
      other.data.showLineNumbers === this.data.showLineNumbers &&
      other.data.showCopyButton === this.data.showCopyButton &&
      other.data.from === this.data.from
    );
  }

  /**
   * 渲染为 DOM 元素
   */
  toDOM(): HTMLElement {
    const { code, language, showLineNumbers, showCopyButton, from, lineStarts } =
      this.data;
    const widgetData = this.data;

    // 容器
    const container = document.createElement('div');
    container.className = 'cm-codeblock-widget';
    container.dataset.from = String(from);
    container.dataset.to = String(this.data.to);
    container.dataset.lineStarts = JSON.stringify(lineStarts);

    if (showLineNumbers) {
      container.className += ' cm-codeblock-line-numbers';
    }

    // 添加点击处理器 - 在捕获阶段处理，阻止事件传播
    container.addEventListener(
      'mousedown',
      (event) => {
        const target = event.target as HTMLElement;

        // 复制按钮不处理
        if (target.closest('.cm-codeblock-copy')) {
          return;
        }

        // 阻止事件传播，防止 CodeMirror 处理
        event.stopPropagation();
        event.preventDefault();

        // 查找点击的行
        const lineEl = target.closest('.cm-codeblock-line');
        let targetPos = widgetData.from;

        console.log('[CodeBlock Widget] mousedown', {
          lineEl: !!lineEl,
          lineIndex: lineEl ? (lineEl as HTMLElement).dataset.lineIndex : null,
          lineStarts: widgetData.lineStarts,
          from: widgetData.from,
          to: widgetData.to,
          code: widgetData.code.substring(0, 50) + '...',
        });

        if (lineEl) {
          const lineIndex = parseInt(
            (lineEl as HTMLElement).dataset.lineIndex || '0',
            10
          );

          if (lineIndex === -1) {
            // 点击开始 fence 行
            targetPos = widgetData.from;
          } else if (lineIndex === -2) {
            // 点击结束 fence 行
            targetPos = widgetData.to;
          } else if (lineIndex >= 0 && lineIndex < widgetData.lineStarts.length) {
            targetPos = widgetData.lineStarts[lineIndex];

            // 计算列位置
            const pre = container.querySelector('pre');
            if (pre) {
              const rect = lineEl.getBoundingClientRect();
              const clickX = event.clientX - rect.left;
              const style = window.getComputedStyle(pre);
              const fontSize = parseFloat(style.fontSize) || 16;
              const charWidth = fontSize * 0.6;
              const charOffset = Math.floor(clickX / charWidth);
              const lineText = lineEl.textContent || '';
              const maxOffset = lineText.length;
              targetPos += Math.min(charOffset, maxOffset);
            }
          }
        }

        console.log('[CodeBlock Widget] targetPos:', targetPos);

        // 触发自定义事件，让 codeBlock.ts 中的处理器设置光标
        container.dispatchEvent(
          new CustomEvent('codeblock-click', {
            bubbles: true,
            detail: { targetPos },
          })
        );
      },
      true // 捕获阶段
    );

    if (showLineNumbers) {
      container.className += ' cm-codeblock-line-numbers';
    }

    // 复制按钮
    if (showCopyButton) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'cm-codeblock-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', 'Copy code');

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
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 2000);
        }
      });

      container.appendChild(copyBtn);
    }

    // 代码区域
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');

    // 开始 fence 行
    const openFence = `\`\`\`${language || ''}`;
    
    // 用原始代码分割行，确保行数和 lineStarts 一致
    const originalLines = code.split('\n');
    
    // 高亮整个代码块
    const result = highlightCode(code, language || undefined);
    const highlightedHtml = result.html;
    
    // 尝试按换行符分割高亮后的 HTML
    // 如果行数不匹配，则对每行单独高亮
    let highlightedLines = highlightedHtml.split('\n');
    
    if (highlightedLines.length !== originalLines.length) {
      // 行数不匹配，对每行单独高亮
      highlightedLines = originalLines.map(line => {
        const lineResult = highlightCode(line, language || undefined);
        return lineResult.html || this.escapeHtml(line) || ' ';
      });
    }

    // 构建所有行：fence + 代码 + fence
    const allLines: string[] = [];
    
    // 开始 fence（索引 -1 表示 fence 行）
    allLines.push(
      `<span class="cm-codeblock-line cm-codeblock-fence" data-line-index="-1">${this.escapeHtml(openFence)}</span>`
    );
    
    // 代码行 - 使用原始行数
    originalLines.forEach((_, index) => {
      const lineHtml = highlightedLines[index] || ' ';
      allLines.push(
        `<span class="cm-codeblock-line" data-line-index="${index}">${lineHtml || ' '}</span>`
      );
    });
    
    // 结束 fence（索引 -2 表示结束 fence）
    allLines.push(
      `<span class="cm-codeblock-line cm-codeblock-fence" data-line-index="-2">\`\`\`</span>`
    );

    codeEl.innerHTML = allLines.join('');

    pre.appendChild(codeEl);
    container.appendChild(pre);

    return container;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * 是否忽略事件
   *
   * 对于 mousedown 事件返回 true，阻止 CodeMirror 默认处理
   * 我们会在 codeBlock.ts 中用 domEventHandlers 自己处理点击
   */
  ignoreEvent(event: Event): boolean {
    // 复制按钮的点击不忽略，让它正常工作
    if (event.type === 'mousedown') {
      const target = event.target as HTMLElement;
      if (target.closest('.cm-codeblock-copy')) {
        return true; // 忽略，让复制按钮自己处理
      }
      // 其他 mousedown 事件也忽略，防止 CodeMirror 先处理
      return true;
    }
    return false;
  }
}

/**
 * 创建代码块 Widget
 */
export function createCodeBlockWidget(data: CodeBlockData): CodeBlockWidget {
  return new CodeBlockWidget(data);
}
