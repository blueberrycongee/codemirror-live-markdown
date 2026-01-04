/**
 * 图片 Widget 测试
 */

import { describe, it, expect, vi } from 'vitest';
import { ImageWidget, createImageWidget, ImageData, ImageOptions } from '../imageWidget';

// Mock loadImage
vi.mock('../../utils/imageLoader', () => ({
  loadImage: vi.fn().mockImplementation((src: string) => {
    if (src.includes('error')) {
      return Promise.resolve({
        src,
        width: 0,
        height: 0,
        loaded: false,
        error: 'Load failed',
      });
    }
    return Promise.resolve({
      src,
      width: 800,
      height: 600,
      loaded: true,
    });
  }),
}));

describe('ImageWidget', () => {
  const defaultData: ImageData = {
    src: 'https://example.com/image.png',
    alt: 'Test image',
    title: 'Image title',
    isLocal: false,
  };

  const defaultOptions: ImageOptions = {
    maxWidth: '100%',
    showAlt: true,
    showLoading: true,
    basePath: '',
  };

  describe('rendering', () => {
    it('should render container element', () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      expect(dom.tagName).toBe('DIV');
      expect(dom.classList.contains('cm-image-widget')).toBe(true);
    });

    it('should render img element', async () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      // 等待图片加载
      await new Promise((resolve) => setTimeout(resolve, 50));

      const img = dom.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.src).toBe(defaultData.src);
    });

    it('should apply max-width style', async () => {
      const options: ImageOptions = { ...defaultOptions, maxWidth: '500px' };
      const widget = new ImageWidget(defaultData, options);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const img = dom.querySelector('img');
      expect(img?.style.maxWidth).toBe('500px');
    });

    it('should show alt text when enabled', async () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const altEl = dom.querySelector('.cm-image-alt');
      expect(altEl).not.toBeNull();
      expect(altEl?.textContent).toBe(defaultData.alt);
    });

    it('should not show alt text when disabled', async () => {
      const options: ImageOptions = { ...defaultOptions, showAlt: false };
      const widget = new ImageWidget(defaultData, options);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const altEl = dom.querySelector('.cm-image-alt');
      expect(altEl).toBeNull();
    });

    it('should not show alt text when alt is empty', async () => {
      const data: ImageData = { ...defaultData, alt: '' };
      const widget = new ImageWidget(data, defaultOptions);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const altEl = dom.querySelector('.cm-image-alt');
      expect(altEl).toBeNull();
    });

    it('should show loading placeholder', () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      const loading = dom.querySelector('.cm-image-loading');
      expect(loading).not.toBeNull();
    });

    it('should show error placeholder on failure', async () => {
      const data: ImageData = {
        ...defaultData,
        src: 'https://example.com/error.png',
      };
      const widget = new ImageWidget(data, defaultOptions);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const error = dom.querySelector('.cm-image-error');
      expect(error).not.toBeNull();
    });

    it('should apply title attribute', async () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const img = dom.querySelector('img');
      expect(img?.title).toBe(defaultData.title);
    });

    it('should handle image without title', async () => {
      const data: ImageData = { ...defaultData, title: undefined };
      const widget = new ImageWidget(data, defaultOptions);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const img = dom.querySelector('img');
      expect(img?.title).toBe('');
    });

    it('should show custom error placeholder', async () => {
      const options: ImageOptions = {
        ...defaultOptions,
        errorPlaceholder: 'Custom error message',
      };
      const data: ImageData = {
        ...defaultData,
        src: 'https://example.com/error.png',
      };
      const widget = new ImageWidget(data, options);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const error = dom.querySelector('.cm-image-error');
      expect(error?.textContent).toContain('Custom error message');
    });
  });

  describe('loading states', () => {
    it('should show spinner while loading', () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      const loading = dom.querySelector('.cm-image-loading');
      expect(loading).not.toBeNull();
      expect(loading?.textContent).toContain('Loading');
    });

    it('should transition to image on load', async () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      // 初始状态应该是 loading
      expect(dom.querySelector('.cm-image-loading')).not.toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 50));

      // 加载后应该显示图片
      expect(dom.querySelector('.cm-image-loading')).toBeNull();
      expect(dom.querySelector('img')).not.toBeNull();
    });

    it('should show error state on failure', async () => {
      const data: ImageData = {
        ...defaultData,
        src: 'https://example.com/error.png',
      };
      const widget = new ImageWidget(data, defaultOptions);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(dom.querySelector('.cm-image-loading')).toBeNull();
      expect(dom.querySelector('.cm-image-error')).not.toBeNull();
    });
  });

  describe('equality', () => {
    it('should return true for identical data', () => {
      const widget1 = new ImageWidget(defaultData, defaultOptions);
      const widget2 = new ImageWidget(defaultData, defaultOptions);

      expect(widget1.eq(widget2)).toBe(true);
    });

    it('should return false for different src', () => {
      const widget1 = new ImageWidget(defaultData, defaultOptions);
      const widget2 = new ImageWidget(
        { ...defaultData, src: 'https://example.com/other.png' },
        defaultOptions
      );

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different alt', () => {
      const widget1 = new ImageWidget(defaultData, defaultOptions);
      const widget2 = new ImageWidget(
        { ...defaultData, alt: 'Different alt' },
        defaultOptions
      );

      expect(widget1.eq(widget2)).toBe(false);
    });

    it('should return false for different title', () => {
      const widget1 = new ImageWidget(defaultData, defaultOptions);
      const widget2 = new ImageWidget(
        { ...defaultData, title: 'Different title' },
        defaultOptions
      );

      expect(widget1.eq(widget2)).toBe(false);
    });
  });

  describe('events', () => {
    it('should allow click to enter edit mode', () => {
      const widget = new ImageWidget(defaultData, defaultOptions);

      // ignoreEvent 返回 false 表示允许事件传播
      expect(widget.ignoreEvent()).toBe(false);
    });

    it('should prevent drag default behavior', async () => {
      const widget = new ImageWidget(defaultData, defaultOptions);
      const dom = widget.toDOM();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const img = dom.querySelector('img');
      expect(img?.draggable).toBe(false);
    });
  });

  describe('createImageWidget', () => {
    it('should create widget with data and options', () => {
      const widget = createImageWidget(defaultData, defaultOptions);

      expect(widget).toBeInstanceOf(ImageWidget);
      expect(widget.data).toEqual(defaultData);
      expect(widget.options).toEqual(defaultOptions);
    });
  });
});
