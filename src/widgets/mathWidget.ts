/**
 * 数学公式 Widget
 * 
 * 使用 KaTeX 渲染数学公式，支持行内和块级两种模式
 */

import { WidgetType } from '@codemirror/view';
import { renderMath } from '../utils/mathCache';

/**
 * 数学公式 Widget 类
 * 
 * 负责将数学公式渲染为 DOM 元素
 */
export class MathWidget extends WidgetType {
  /**
   * @param source - 公式源码（不包含 $ 符号）
   * @param isBlock - 是否为块级公式
   */
  constructor(
    readonly source: string,
    readonly isBlock: boolean
  ) {
    super();
  }

  /**
   * 判断两个 Widget 是否相等
   * 
   * 用于优化：如果相等则不重新渲染
   */
  eq(other: MathWidget): boolean {
    return other.source === this.source && other.isBlock === this.isBlock;
  }

  /**
   * 渲染为 DOM 元素
   */
  toDOM(): HTMLElement {
    const container = document.createElement(this.isBlock ? 'div' : 'span');
    container.className = this.isBlock ? 'cm-math-block' : 'cm-math-inline';

    try {
      const rendered = renderMath(this.source, this.isBlock);
      container.innerHTML = rendered;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      container.textContent = `[Math Error: ${errorMsg}]`;
      container.className += ' cm-math-error';
    }

    return container;
  }

  /**
   * 是否忽略事件
   * 
   * 返回 false 允许点击公式进入编辑模式
   */
  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * 创建数学公式 Widget
 * 
 * @param source - 公式源码（不包含 $ 符号）
 * @param isBlock - 是否为块级公式
 * @returns MathWidget 实例
 */
export function createMathWidget(source: string, isBlock: boolean): MathWidget {
  return new MathWidget(source, isBlock);
}
