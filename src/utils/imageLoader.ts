/**
 * 图片加载工具
 *
 * 提供图片异步加载、缓存和路径解析功能
 */

/**
 * 加载后的图片信息
 */
export interface LoadedImage {
  /** 图片源地址 */
  src: string;
  /** 图片宽度 */
  width: number;
  /** 图片高度 */
  height: number;
  /** 是否加载成功 */
  loaded: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 图片加载选项
 */
export interface LoadImageOptions {
  /** 超时时间（毫秒），默认 10000 */
  timeout?: number;
  /** 本地图片基础路径 */
  basePath?: string;
}

// 图片缓存
const imageCache = new Map<string, LoadedImage>();

// 正在加载的 Promise 缓存（防止重复请求）
const loadingPromises = new Map<string, Promise<LoadedImage>>();

/**
 * 解析图片路径
 *
 * @param src - 原始路径
 * @param basePath - 基础路径
 * @returns 解析后的完整路径
 */
export function resolveImagePath(src: string, basePath?: string): string {
  // data URL 直接返回
  if (src.startsWith('data:')) {
    return src;
  }

  // 绝对 URL 直接返回
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // 相对路径需要解析
  if (basePath) {
    // 移除路径遍历攻击
    const sanitizedSrc = src.replace(/\.\.\//g, '').replace(/^\.\//g, '');

    // 确保 basePath 以 / 结尾
    const normalizedBase = basePath.endsWith('/') ? basePath : basePath + '/';

    return normalizedBase + sanitizedSrc;
  }

  return src;
}

/**
 * 加载单张图片
 *
 * @param src - 图片地址
 * @param options - 加载选项
 * @returns 加载结果
 */
export function loadImage(
  src: string,
  options: LoadImageOptions = {}
): Promise<LoadedImage> {
  const { timeout = 10000, basePath } = options;

  // 解析路径
  const resolvedSrc = resolveImagePath(src, basePath);

  // 检查缓存
  const cached = imageCache.get(resolvedSrc);
  if (cached) {
    return Promise.resolve(cached);
  }

  // 检查是否正在加载
  const loading = loadingPromises.get(resolvedSrc);
  if (loading) {
    return loading;
  }

  // 创建加载 Promise
  const promise = new Promise<LoadedImage>((resolve) => {
    const img = new Image();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      loadingPromises.delete(resolvedSrc);
    };

    const handleSuccess = () => {
      if (resolved) return;
      resolved = true;
      cleanup();

      const result: LoadedImage = {
        src: resolvedSrc,
        width: img.width,
        height: img.height,
        loaded: true,
      };

      imageCache.set(resolvedSrc, result);
      resolve(result);
    };

    const handleError = (error: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();

      const result: LoadedImage = {
        src: resolvedSrc,
        width: 0,
        height: 0,
        loaded: false,
        error,
      };

      // 不缓存失败的结果，允许重试
      resolve(result);
    };

    // 设置超时
    timeoutId = setTimeout(() => {
      handleError(`Image load timeout after ${timeout}ms`);
    }, timeout);

    img.onload = handleSuccess;
    img.onerror = () => handleError('Image load failed');

    // 开始加载
    img.src = resolvedSrc;
  });

  loadingPromises.set(resolvedSrc, promise);
  return promise;
}

/**
 * 预加载多张图片
 *
 * @param srcs - 图片地址数组
 * @param options - 加载选项
 * @returns 所有图片的加载结果
 */
export async function preloadImages(
  srcs: string[],
  options: LoadImageOptions = {}
): Promise<LoadedImage[]> {
  // 并行加载所有图片
  const promises = srcs.map((src) => loadImage(src, options));
  return Promise.all(promises);
}

/**
 * 清除图片缓存
 */
export function clearImageCache(): void {
  imageCache.clear();
}
