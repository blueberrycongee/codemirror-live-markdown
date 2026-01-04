/**
 * 代码高亮工具
 *
 * 封装 lowlight 提供代码语法高亮功能
 * 支持按需加载语言，优雅降级处理
 */

import type { LanguageFn } from 'highlight.js';

/**
 * 高亮结果接口
 */
export interface HighlightResult {
  /** 高亮后的 HTML 字符串 */
  html: string;
  /** 语言标识 */
  language: string;
  /** 是否为自动检测的语言 */
  detected: boolean;
}

// lowlight 实例（延迟初始化）
let lowlightInstance: any = null;
let lowlightAvailable: boolean | null = null;

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 将 HAST 节点转换为 HTML 字符串
 */
function hastToHtml(node: any): string {
  if (!node) return '';

  if (node.type === 'text') {
    return escapeHtml(node.value || '');
  }

  if (node.type === 'element') {
    const tag = node.tagName;
    const classes = node.properties?.className?.join(' ') || '';
    const classAttr = classes ? ` class="${classes}"` : '';
    const children = (node.children || []).map(hastToHtml).join('');
    return `<${tag}${classAttr}>${children}</${tag}>`;
  }

  if (node.type === 'root') {
    return (node.children || []).map(hastToHtml).join('');
  }

  return '';
}

// 同步初始化（用于测试和首次调用）
function initLowlightSync(): boolean {
  if (lowlightAvailable !== null) {
    return lowlightAvailable;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createLowlight, common } = require('lowlight');
    lowlightInstance = createLowlight(common);
    lowlightAvailable = true;
    return true;
  } catch {
    lowlightAvailable = false;
    return false;
  }
}

/**
 * 重置高亮器（用于测试）
 */
export function resetHighlighter(): void {
  lowlightInstance = null;
  lowlightAvailable = null;
  initLowlightSync();
}

/**
 * 高亮代码
 *
 * @param code - 源代码
 * @param lang - 语言标识（可选，不传则自动检测）
 * @returns 高亮结果
 */
export function highlightCode(code: string, lang?: string): HighlightResult {
  // 空代码直接返回
  if (!code) {
    return {
      html: '',
      language: lang || 'text',
      detected: false,
    };
  }

  // 确保 lowlight 已初始化
  if (!initLowlightSync()) {
    // lowlight 不可用，返回转义后的纯文本
    return {
      html: escapeHtml(code),
      language: lang || 'text',
      detected: false,
    };
  }

  try {
    if (lang) {
      // 指定语言
      if (lowlightInstance.registered(lang)) {
        const result = lowlightInstance.highlight(lang, code);
        return {
          html: hastToHtml(result),
          language: lang,
          detected: false,
        };
      } else {
        // 语言未注册，返回纯文本
        return {
          html: escapeHtml(code),
          language: lang,
          detected: false,
        };
      }
    } else {
      // 自动检测语言
      const result = lowlightInstance.highlightAuto(code);
      return {
        html: hastToHtml(result),
        language: result.data?.language || 'text',
        detected: true,
      };
    }
  } catch {
    // 高亮失败，返回纯文本
    return {
      html: escapeHtml(code),
      language: lang || 'text',
      detected: false,
    };
  }
}

/**
 * 注册语言
 *
 * @param name - 语言名称
 * @param syntax - 语言定义函数
 */
export function registerLanguage(name: string, syntax: LanguageFn): void {
  if (!initLowlightSync()) {
    console.warn('[codeHighlight] lowlight not available, cannot register language');
    return;
  }

  try {
    lowlightInstance.register({ [name]: syntax });
  } catch (error) {
    console.warn(`[codeHighlight] Failed to register language "${name}":`, error);
  }
}

/**
 * 检查语言是否已注册
 *
 * @param name - 语言名称
 * @returns 是否已注册
 */
export function isLanguageRegistered(name: string): boolean {
  if (!initLowlightSync()) {
    return false;
  }

  return lowlightInstance.registered(name);
}
