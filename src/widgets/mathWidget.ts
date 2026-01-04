/**
 * Math Formula Widget
 *
 * Uses KaTeX to render math formulas, supports inline and block modes
 */

import { WidgetType } from '@codemirror/view';
import { renderMath } from '../utils/mathCache';

/**
 * Math Formula Widget class
 *
 * Responsible for rendering math formulas to DOM elements
 */
export class MathWidget extends WidgetType {
  /**
   * @param source - Formula source (without $ symbols)
   * @param isBlock - Whether it's a block formula
   */
  constructor(
    readonly source: string,
    readonly isBlock: boolean
  ) {
    super();
  }

  /**
   * Check if two widgets are equal
   *
   * Used for optimization: skip re-render if equal
   */
  eq(other: MathWidget): boolean {
    return other.source === this.source && other.isBlock === this.isBlock;
  }

  /**
   * Render to DOM element
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
   * Whether to ignore events
   *
   * Return false to allow click to enter edit mode
   */
  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Create math formula widget
 *
 * @param source - Formula source (without $ symbols)
 * @param isBlock - Whether it's a block formula
 * @returns MathWidget instance
 */
export function createMathWidget(source: string, isBlock: boolean): MathWidget {
  return new MathWidget(source, isBlock);
}
