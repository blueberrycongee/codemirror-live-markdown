/**
 * 链接 Widget 测试
 */

import { describe, it, expect, vi } from 'vitest';
import { LinkWidget, createLinkWidget, LinkData, LinkOptions } from '../linkWidget';

describe('LinkWidget', () => {
  const defaultData: LinkData = {
    text: 'Example Link',
    url: 'https://example.com',
    title: 'Link title',
    isWikiLink: false,
  };

  const defaultOptions: LinkOptions = {
    openInNewTab: true,
    showPreview: false,
  };

  describe('rendering', () => {
    it('should render anchor element', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      expect(dom.tagName).toBe('A');
    });

    it('should display link text', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      expect(dom.textContent).toBe(defaultData.text);
    });

    it('should set href attribute', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM() as HTMLAnchorElement;

      expect(dom.href).toBe(defaultData.url + '/');
    });

    it('should set title attribute when provided', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM() as HTMLAnchorElement;

      expect(dom.title).toBe(defaultData.title);
    });

    it('should not set title when not provided', () => {
      const data: LinkData = { ...defaultData, title: undefined };
      const widget = new LinkWidget(data, defaultOptions);
      const dom = widget.toDOM() as HTMLAnchorElement;

      expect(dom.title).toBe('');
    });

    it('should add target="_blank" when openInNewTab', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM() as HTMLAnchorElement;

      expect(dom.target).toBe('_blank');
    });

    it('should not add target="_blank" when openInNewTab is false', () => {
      const options: LinkOptions = { ...defaultOptions, openInNewTab: false };
      const widget = new LinkWidget(defaultData, options);
      const dom = widget.toDOM() as HTMLAnchorElement;

      expect(dom.target).toBe('');
    });

    it('should add rel="noopener noreferrer" for external links', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM() as HTMLAnchorElement;

      expect(dom.rel).toBe('noopener noreferrer');
    });

    it('should have cm-link-widget class', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      expect(dom.classList.contains('cm-link-widget')).toBe(true);
    });
  });

  describe('wiki links', () => {
    const wikiData: LinkData = {
      text: 'Wiki Page',
      url: 'Wiki Page',
      isWikiLink: true,
    };

    it('should render wiki link with special style', () => {
      const widget = new LinkWidget(wikiData, defaultOptions);
      const dom = widget.toDOM();

      expect(dom.classList.contains('cm-wikilink-widget')).toBe(true);
    });

    it('should call onWikiLinkClick handler', () => {
      const handler = vi.fn();
      const options: LinkOptions = {
        ...defaultOptions,
        onWikiLinkClick: handler,
      };
      const widget = new LinkWidget(wikiData, options);
      const dom = widget.toDOM();

      // 模拟点击
      dom.click();

      expect(handler).toHaveBeenCalledWith('Wiki Page');
    });

    it('should prevent default navigation for wiki links', () => {
      const handler = vi.fn();
      const options: LinkOptions = {
        ...defaultOptions,
        onWikiLinkClick: handler,
      };
      const widget = new LinkWidget(wikiData, options);
      const dom = widget.toDOM() as HTMLAnchorElement;

      // Wiki 链接应该有 href="#" 或空，并通过 click handler 处理
      // 检查 getAttribute 而不是 href 属性（href 属性会被浏览器解析）
      expect(dom.getAttribute('href')).toBe('');
    });
  });

  describe('preview', () => {
    it('should show URL preview on hover when enabled', async () => {
      const options: LinkOptions = { ...defaultOptions, showPreview: true };
      const widget = new LinkWidget(defaultData, options);
      const dom = widget.toDOM();

      // 模拟 mouseenter
      dom.dispatchEvent(new MouseEvent('mouseenter'));

      // 等待 DOM 更新
      await new Promise((resolve) => setTimeout(resolve, 10));

      const preview = dom.querySelector('.cm-link-preview');
      expect(preview).not.toBeNull();
      expect(preview?.textContent).toContain(defaultData.url);
    });

    it('should hide preview on mouse leave', async () => {
      const options: LinkOptions = { ...defaultOptions, showPreview: true };
      const widget = new LinkWidget(defaultData, options);
      const dom = widget.toDOM();

      // 模拟 mouseenter
      dom.dispatchEvent(new MouseEvent('mouseenter'));
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 模拟 mouseleave
      dom.dispatchEvent(new MouseEvent('mouseleave'));
      await new Promise((resolve) => setTimeout(resolve, 10));

      const preview = dom.querySelector('.cm-link-preview');
      expect(preview).toBeNull();
    });

    it('should not show preview when disabled', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      dom.dispatchEvent(new MouseEvent('mouseenter'));

      const preview = dom.querySelector('.cm-link-preview');
      expect(preview).toBeNull();
    });
  });

  describe('equality', () => {
    it('should return true for identical data', () => {
      const widget1 = new LinkWidget(defaultData, defaultOptions);
      const widget2 = new LinkWidget(defaultData, defaultOptions);

      expect(widget1.eq(widget2)).toBe(true);
    });

    it('should return false for different text', () => {
      const widget1 = new LinkWidget(defaultData, defaultOptions);
      const widget2 = new LinkWidget(
        { ...defaultData, text: 'Different' },
        defaultOptions
      );

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different url', () => {
      const widget1 = new LinkWidget(defaultData, defaultOptions);
      const widget2 = new LinkWidget(
        { ...defaultData, url: 'https://other.com' },
        defaultOptions
      );

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different isWikiLink', () => {
      const widget1 = new LinkWidget(defaultData, defaultOptions);
      const widget2 = new LinkWidget(
        { ...defaultData, isWikiLink: true },
        defaultOptions
      );

      expect(widget1.eq(widget2)).toBe(false);
    });
  });

  describe('events', () => {
    it('should allow click to enter edit mode', () => {
      const widget = new LinkWidget(defaultData, defaultOptions);

      // ignoreEvent 返回 false 表示允许事件传播
      expect(widget.ignoreEvent()).toBe(false);
    });
  });

  describe('createLinkWidget', () => {
    it('should create widget with data and options', () => {
      const widget = createLinkWidget(defaultData, defaultOptions);

      expect(widget).toBeInstanceOf(LinkWidget);
      expect(widget.data).toEqual(defaultData);
      expect(widget.options).toEqual(defaultOptions);
    });
  });

  describe('security', () => {
    it('should not allow javascript: URLs', () => {
      const data: LinkData = {
        ...defaultData,
        url: 'javascript:alert(1)',
      };
      const widget = new LinkWidget(data, defaultOptions);
      const dom = widget.toDOM() as HTMLAnchorElement;

      // 应该被清理或阻止
      expect(dom.href).not.toContain('javascript:');
    });

    it('should encode special characters in URL', () => {
      const data: LinkData = {
        ...defaultData,
        url: 'https://example.com/path?q=<script>',
      };
      const widget = new LinkWidget(data, defaultOptions);
      const dom = widget.toDOM() as HTMLAnchorElement;

      expect(dom.href).not.toContain('<script>');
    });
  });
});
