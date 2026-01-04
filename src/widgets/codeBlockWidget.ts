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

    // 容器
    const container = document.createElement('div');
    container.className = 'cm-codeblock-widget';
    container.dataset.from = String(from);
    container.dataset.lineStarts = JSON.stringify(lineStarts);

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
    
    // 高亮代码
    const result = highlightCode(code, language || undefined);

    // 构建所有行：fence + 代码 + fence
    const codeLines = result.html.split('\n');
    const allLines: string[] = [];
    
    // 开始 fence（索引 -1 表示 fence 行）
    allLines.push(
      `<span class="cm-codeblock-line cm-codeblock-fence" data-line-index="-1">${this.escapeHtml(openFence)}</span>`
    );
    
    // 代码行
    codeLines.forEach((line, index) => {
      allLines.push(
        `<span class="cm-codeblock-line" data-line-index="${index}">${line || ' '}</span>`
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
   * 返回 false 允许点击进入编辑模式
   */
  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * 创建代码块 Widget
 */
export function createCodeBlockWidget(data: CodeBlockData): CodeBlockWidget {
  return new CodeBlockWidget(data);
}
