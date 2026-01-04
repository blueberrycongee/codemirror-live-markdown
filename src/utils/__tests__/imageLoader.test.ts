/**
 * 图片加载工具测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadImage,
  preloadImages,
  clearImageCache,
  resolveImagePath,
} from '../imageLoader';

// Mock Image 对象
class MockImage {
  src = '';
  width = 0;
  height = 0;
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  constructor() {
    // 模拟异步加载
    setTimeout(() => {
      if (this.src.includes('error') || this.src.includes('invalid')) {
        this.onerror?.(new Error('Load failed'));
      } else {
        this.width = 800;
        this.height = 600;
        this.onload?.();
      }
    }, 10);
  }
}

// 替换全局 Image
const originalImage = globalThis.Image;

describe('imageLoader', () => {
  beforeEach(() => {
    clearImageCache();
    (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    vi.clearAllTimers();
  });

  describe('loadImage', () => {
    it('should load remote image successfully', async () => {
      const result = await loadImage('https://example.com/image.png');

      expect(result.src).toBe('https://example.com/image.png');
      expect(result.loaded).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return dimensions after load', async () => {
      const result = await loadImage('https://example.com/image.png');

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should handle load failure', async () => {
      const result = await loadImage('https://example.com/error.png');

      expect(result.loaded).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid URL', async () => {
      const result = await loadImage('invalid-url');

      expect(result.loaded).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout', async () => {
      vi.useFakeTimers();

      // 创建一个永不完成的 Mock
      class SlowImage {
        src = '';
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
      }
      (globalThis as unknown as { Image: typeof SlowImage }).Image = SlowImage;

      const promise = loadImage('https://example.com/slow.png', { timeout: 100 });

      // 快进超时时间
      vi.advanceTimersByTime(150);

      const result = await promise;

      expect(result.loaded).toBe(false);
      expect(result.error).toContain('timeout');

      vi.useRealTimers();
    });

    it('should resolve relative paths with basePath', async () => {
      const result = await loadImage('./image.png', {
        basePath: '/assets/images/',
      });

      expect(result.src).toBe('/assets/images/image.png');
    });
  });

  describe('preloadImages', () => {
    it('should load multiple images in parallel', async () => {
      const results = await preloadImages([
        'https://example.com/image1.png',
        'https://example.com/image2.png',
        'https://example.com/image3.png',
      ]);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.loaded)).toBe(true);
    });

    it('should handle partial failures', async () => {
      const results = await preloadImages([
        'https://example.com/image1.png',
        'https://example.com/error.png',
        'https://example.com/image3.png',
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].loaded).toBe(true);
      expect(results[1].loaded).toBe(false);
      expect(results[2].loaded).toBe(true);
    });

    it('should deduplicate same URLs', async () => {
      const results = await preloadImages([
        'https://example.com/image.png',
        'https://example.com/image.png',
        'https://example.com/image.png',
      ]);

      expect(results).toHaveLength(3);
      // 所有结果应该相同
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
    });
  });

  describe('caching', () => {
    it('should cache loaded images', async () => {
      const result1 = await loadImage('https://example.com/cached.png');
      const result2 = await loadImage('https://example.com/cached.png');

      expect(result1).toEqual(result2);
    });

    it('should return cached result for same URL', async () => {
      // 第一次加载
      await loadImage('https://example.com/test.png');

      // 替换 Image 为一个会失败的版本
      class FailImage {
        src = '';
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        constructor() {
          setTimeout(() => this.onerror?.(new Error('Should not be called')), 10);
        }
      }
      (globalThis as unknown as { Image: typeof FailImage }).Image = FailImage;

      // 第二次应该从缓存返回，不会触发新的加载
      const result = await loadImage('https://example.com/test.png');

      expect(result.loaded).toBe(true);
    });

    it('should clear cache on demand', async () => {
      await loadImage('https://example.com/clear-test.png');

      clearImageCache();

      // 替换为失败的 Image
      class FailImage {
        src = '';
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        constructor() {
          setTimeout(() => this.onerror?.(new Error('Reloaded')), 10);
        }
      }
      (globalThis as unknown as { Image: typeof FailImage }).Image = FailImage;

      // 清除缓存后应该重新加载
      const result = await loadImage('https://example.com/clear-test.png');

      expect(result.loaded).toBe(false);
    });
  });

  describe('resolveImagePath', () => {
    it('should return absolute URL as-is', () => {
      expect(resolveImagePath('https://example.com/image.png')).toBe(
        'https://example.com/image.png'
      );
      expect(resolveImagePath('http://example.com/image.png')).toBe(
        'http://example.com/image.png'
      );
    });

    it('should resolve relative path with basePath', () => {
      expect(resolveImagePath('./image.png', '/assets/')).toBe('/assets/image.png');
      expect(resolveImagePath('image.png', '/assets/')).toBe('/assets/image.png');
    });

    it('should handle basePath without trailing slash', () => {
      expect(resolveImagePath('image.png', '/assets')).toBe('/assets/image.png');
    });

    it('should prevent path traversal attacks', () => {
      expect(resolveImagePath('../../../etc/passwd', '/assets/')).toBe(
        '/assets/etc/passwd'
      );
      expect(resolveImagePath('../../secret.png', '/assets/')).toBe(
        '/assets/secret.png'
      );
    });

    it('should handle data URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      expect(resolveImagePath(dataUrl)).toBe(dataUrl);
    });
  });
});
