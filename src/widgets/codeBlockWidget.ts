/**
 * Code Block Widget
 *
 * Renders syntax-highlighted code blocks with copy button and line numbers
 * Supports precise click position mapping
 */

import { EditorView, WidgetType } from '@codemirror/view';
import { highlightCode } from '../utils/codeHighlight';
import { setCodeBlockSourceMode } from '../plugins/codeBlockEffects';

/**
 * Code block data interface
 */
export interface CodeBlockData {
  /** Source code */
  code: string;
  /** Language identifier */
  language: string;
  /** Whether to show line numbers */
  showLineNumbers: boolean;
  /** Whether to show copy button */
  showCopyButton: boolean;
  /** Whether to show source toggle button */
  showSourceToggle?: boolean;
  /** Code block start position in document */
  from: number;
  /** Code block end position in document */
  to: number;
  /** Code content start position (after ```language) */
  codeFrom: number;
  /** Start position of each line (relative to document) */
  lineStarts: number[];
}

/**
 * Code Block Widget class
 */
export class CodeBlockWidget extends WidgetType {
  constructor(readonly data: CodeBlockData) {
    super();
  }

  /**
   * Check if two widgets are equal
   */
  eq(other: CodeBlockWidget): boolean {
    return (
      other.data.code === this.data.code &&
      other.data.language === this.data.language &&
      other.data.showLineNumbers === this.data.showLineNumbers &&
      other.data.showCopyButton === this.data.showCopyButton &&
      other.data.showSourceToggle === this.data.showSourceToggle &&
      other.data.from === this.data.from
    );
  }

  /**
   * Render to DOM element
   */
  toDOM(view?: EditorView): HTMLElement {
    const {
      code,
      language,
      showLineNumbers,
      showCopyButton,
      showSourceToggle = false,
      from,
      lineStarts,
    } = this.data;
    const widgetData = this.data;

    // Container
    const container = document.createElement('div');
    container.className = 'cm-codeblock-widget';
    container.dataset.from = String(from);
    container.dataset.to = String(this.data.to);
    container.dataset.lineStarts = JSON.stringify(lineStarts);

    if (showLineNumbers) {
      container.className += ' cm-codeblock-line-numbers';
    }

    const enableClickToEdit = !showSourceToggle;

    // Auto mode: click rendered block to jump to source position.
    if (enableClickToEdit && view) {
      container.addEventListener(
        'mousedown',
        (event) => {
          const target = event.target as HTMLElement;

          // Don't handle toolbar buttons
          if (target.closest('.cm-codeblock-copy, .cm-codeblock-toggle')) {
            return;
          }

          event.stopPropagation();
          event.preventDefault();

          // Find clicked line
          const lineEl = target.closest('.cm-codeblock-line');
          let targetPos = widgetData.from;

          if (lineEl) {
            const lineIndex = parseInt(
              (lineEl as HTMLElement).dataset.lineIndex || '0',
              10
            );

            if (lineIndex === -1) {
              targetPos = widgetData.from;
            } else if (lineIndex === -2) {
              targetPos = widgetData.to;
            } else if (
              lineIndex >= 0 &&
              lineIndex < widgetData.lineStarts.length
            ) {
              targetPos = widgetData.lineStarts[lineIndex];

              // Calculate column position using precise measurement
              const charOffset = this.measureClickOffset(
                lineEl as HTMLElement,
                event.clientX,
                widgetData.code.split('\n')[lineIndex] || ''
              );
              targetPos += charOffset;
            }
          }

          view.dispatch({
            selection: { anchor: targetPos },
            scrollIntoView: true,
          });
          view.focus();
        },
        true
      );
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'cm-codeblock-actions';

    if (showSourceToggle) {
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'cm-codeblock-toggle';
      toggleBtn.textContent = 'MD';
      toggleBtn.setAttribute('aria-label', 'Show markdown source');
      toggleBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!view) return;
        view.dispatch({
          selection: { anchor: widgetData.from },
          effects: setCodeBlockSourceMode.of({
            from: widgetData.from,
            to: widgetData.to,
            showSource: true,
          }),
          scrollIntoView: true,
        });
        view.focus();
      });
      toolbar.appendChild(toggleBtn);
    }

    // Copy button
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

      toolbar.appendChild(copyBtn);
    }

    if (toolbar.childElementCount > 0) {
      container.appendChild(toolbar);
    }

    // Code area
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');

    // Start fence line
    const openFence = `\`\`\`${language || ''}`;

    // Split original code by lines to ensure line count matches lineStarts
    const originalLines = code.split('\n');

    // Highlight entire code block
    const result = highlightCode(code, language || undefined);
    const highlightedHtml = result.html;

    // Try to split highlighted HTML by newlines
    // If line count doesn't match, highlight each line separately
    let highlightedLines = highlightedHtml.split('\n');

    if (highlightedLines.length !== originalLines.length) {
      // Line count mismatch, highlight each line separately
      highlightedLines = originalLines.map((line) => {
        const lineResult = highlightCode(line, language || undefined);
        return lineResult.html || this.escapeHtml(line) || ' ';
      });
    }

    // Build all lines: fence + code + fence
    const allLines: string[] = [];

    // Start fence (index -1 indicates fence line)
    allLines.push(
      `<span class="cm-codeblock-line cm-codeblock-fence" data-line-index="-1">${this.escapeHtml(openFence)}</span>`
    );

    // Code lines - use original line count
    originalLines.forEach((_, index) => {
      const lineHtml = highlightedLines[index] || ' ';
      allLines.push(
        `<span class="cm-codeblock-line" data-line-index="${index}">${lineHtml || ' '}</span>`
      );
    });

    // End fence (index -2 indicates end fence)
    allLines.push(
      `<span class="cm-codeblock-line cm-codeblock-fence" data-line-index="-2">\`\`\`</span>`
    );

    codeEl.innerHTML = allLines.join('');

    pre.appendChild(codeEl);
    container.appendChild(pre);

    return container;
  }

  /**
   * HTML escape
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Precisely measure click position to character offset
   *
   * Uses Canvas to measure text width and find character at click position
   *
   * @param lineEl - Line element
   * @param clientX - Click X coordinate
   * @param sourceText - Source line text (to limit max offset)
   * @returns Character offset
   */
  private measureClickOffset(
    lineEl: HTMLElement,
    clientX: number,
    sourceText: string
  ): number {
    const rect = lineEl.getBoundingClientRect();
    const clickX = clientX - rect.left;

    // Get line padding
    const style = window.getComputedStyle(lineEl);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    // Adjust click position by subtracting padding
    const textClickX = clickX - paddingLeft;

    if (textClickX <= 0) {
      return 0;
    }

    // Use Canvas to measure text width
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      // Fallback: use simple estimation
      const fontSize = parseFloat(style.fontSize) || 16;
      const charWidth = fontSize * 0.6;
      const charOffset = Math.floor(textClickX / charWidth);
      return Math.min(charOffset, sourceText.length);
    }

    // Set same font as line element
    ctx.font = `${style.fontSize} ${style.fontFamily}`;

    // Binary search for character at click position
    // Use source text for measurement to ensure consistency with source position
    const text = sourceText;
    let left = 0;
    let right = text.length;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      const width = ctx.measureText(text.substring(0, mid)).width;

      if (width <= textClickX) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }

    // Check if closer to next character
    if (left < text.length) {
      const currentWidth = ctx.measureText(text.substring(0, left)).width;
      const nextWidth = ctx.measureText(text.substring(0, left + 1)).width;
      const midPoint = (currentWidth + nextWidth) / 2;

      if (textClickX > midPoint) {
        left++;
      }
    }

    return Math.min(left, sourceText.length);
  }

  /**
   * Whether to ignore events
   *
   * Return true for mousedown to prevent CodeMirror default handling
   * We handle clicks ourselves in codeBlock.ts with domEventHandlers
   */
  ignoreEvent(event: Event): boolean {
    if (event.type === 'mousedown') {
      const target = event.target as HTMLElement | null;

      // Toggle mode: allow selecting code text directly.
      if (this.data.showSourceToggle) {
        return true;
      }

      if (target?.closest('.cm-codeblock-copy')) {
        return true;
      }
      return true;
    }
    return false;
  }
}

/**
 * Create code block widget
 */
export function createCodeBlockWidget(data: CodeBlockData): CodeBlockWidget {
  return new CodeBlockWidget(data);
}

export class CodeBlockSourceToggleWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  toDOM(view?: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-codeblock-source-toggle';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-codeblock-toggle';
    button.textContent = 'Code';
    button.setAttribute('aria-label', 'Show rendered code block');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!view) return;
      view.dispatch({
        effects: setCodeBlockSourceMode.of({
          from: this.from,
          to: this.to,
          showSource: false,
        }),
        scrollIntoView: true,
      });
      view.focus();
    });

    container.appendChild(button);
    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export function createCodeBlockSourceToggleWidget(
  from: number,
  to: number
): CodeBlockSourceToggleWidget {
  return new CodeBlockSourceToggleWidget(from, to);
}
