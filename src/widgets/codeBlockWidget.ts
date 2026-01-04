/**
 * 代码块 Widget
 *
 * 渲染语法高亮的代码块，支持复制按钮和行号
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
  /** 代码内容在文档中的起始位置 */
  codeFrom: number;
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
      other.data.showCopyButton === this.data.showCopyButton
    );
  }

  /**
   * 渲染为 DOM 元素
   */
  toDOM(): HTMLElement {
    const { code, language, showLineNumbers, showCopyButton, codeFrom } = this.data;

    // 容器
    const container = document.createElement('div');
    container.className = 'cm-codeblock-widget';
    if (showLineNumbers) {
      container.className += ' cm-codeblock-line-numbers';
    }

    // 存储代码起始位置，用于点击定位
    container.dataset.codeFrom = String(codeFrom);

    // 语言标签
    if (language) {
      const langLabel = document.createElement('span');
      langLabel.className = 'cm-codeblock-lang';
      langLabel.textContent = language;
      container.appendChild(langLabel);
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

    // 高亮代码
    const result = highlightCode(code, language || undefined);

    if (showLineNumbers) {
      // 按行分割并包装，每行存储其在代码中的偏移量
      const lines = code.split('\n');
      const highlightedLines = result.html.split('\n');
      let offset = 0;

      codeEl.innerHTML = highlightedLines
        .map((line, idx) => {
          const lineOffset = offset;
          offset += (lines[idx]?.length ?? 0) + 1; // +1 for newline
          return `<span class="line" data-offset="${lineOffset}">${line || ' '}</span>`;
        })
        .join('\n');
    } else {
      // 不显示行号时，也按行分割以支持点击定位
      const lines = code.split('\n');
      const highlightedLines = result.html.split('\n');
      let offset = 0;

      codeEl.innerHTML = highlightedLines
        .map((line, idx) => {
          const lineOffset = offset;
          offset += (lines[idx]?.length ?? 0) + 1;
          return `<span class="line" data-offset="${lineOffset}">${line || ' '}</span>`;
        })
        .join('\n');
    }

    pre.appendChild(codeEl);
    container.appendChild(pre);

    return container;
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
