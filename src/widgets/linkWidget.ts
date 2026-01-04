/**
 * 链接 Widget
 *
 * 渲染 Markdown 链接预览，支持标准链接和 Wiki 链接
 */

import { WidgetType } from '@codemirror/view';

/**
 * 链接数据接口
 */
export interface LinkData {
  /** 链接文本 */
  text: string;
  /** 链接地址 */
  url: string;
  /** 标题 */
  title?: string;
  /** 是否为 Wiki 链接 */
  isWikiLink: boolean;
}

/**
 * 链接选项接口
 */
export interface LinkOptions {
  /** 是否在新标签页打开，默认 true */
  openInNewTab?: boolean;
  /** Wiki 链接点击处理器 */
  onWikiLinkClick?: (link: string) => void;
  /** 是否显示链接预览，默认 false */
  showPreview?: boolean;
}

/**
 * 危险协议列表
 */
const DANGEROUS_PROTOCOLS = ['javascript:', 'vbscript:', 'data:text/html'];

/**
 * 检查 URL 是否安全
 */
function isSafeUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase().trim();
  return !DANGEROUS_PROTOCOLS.some((protocol) => lowerUrl.startsWith(protocol));
}

/**
 * 清理 URL
 */
function sanitizeUrl(url: string): string {
  if (!isSafeUrl(url)) {
    return '';
  }
  // 编码特殊字符
  try {
    return encodeURI(url);
  } catch {
    return '';
  }
}

/**
 * 链接 Widget 类
 */
export class LinkWidget extends WidgetType {
  constructor(
    readonly data: LinkData,
    readonly options: LinkOptions
  ) {
    super();
  }

  /**
   * 判断两个 Widget 是否相等
   */
  eq(other: LinkWidget): boolean {
    return (
      other.data.text === this.data.text &&
      other.data.url === this.data.url &&
      other.data.isWikiLink === this.data.isWikiLink
    );
  }

  /**
   * 渲染为 DOM 元素
   */
  toDOM(): HTMLElement {
    const { text, url, title, isWikiLink } = this.data;
    const {
      openInNewTab = true,
      onWikiLinkClick,
      showPreview = false,
    } = this.options;

    const anchor = document.createElement('a');
    anchor.textContent = text;
    anchor.title = title || '';

    if (isWikiLink) {
      // Wiki 链接样式
      anchor.className = 'cm-link-widget cm-wikilink-widget';
      anchor.href = '';

      // Wiki 链接点击处理
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onWikiLinkClick?.(url);
      });
    } else {
      // 标准链接
      anchor.className = 'cm-link-widget';

      const safeUrl = sanitizeUrl(url);
      if (safeUrl) {
        anchor.href = safeUrl;
      }

      if (openInNewTab) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
    }

    // 链接预览
    if (showPreview && !isWikiLink) {
      let previewEl: HTMLElement | null = null;

      anchor.addEventListener('mouseenter', () => {
        previewEl = document.createElement('span');
        previewEl.className = 'cm-link-preview';
        previewEl.textContent = url;
        anchor.appendChild(previewEl);
      });

      anchor.addEventListener('mouseleave', () => {
        if (previewEl) {
          previewEl.remove();
          previewEl = null;
        }
      });
    }

    return anchor;
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
 * 创建链接 Widget
 */
export function createLinkWidget(
  data: LinkData,
  options: LinkOptions
): LinkWidget {
  return new LinkWidget(data, options);
}
