/**
 * Image Loader Utility
 *
 * Provides async image loading, caching, and path resolution
 */

/**
 * Loaded image info
 */
export interface LoadedImage {
  /** Image source URL */
  src: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Whether load succeeded */
  loaded: boolean;
  /** Error message */
  error?: string;
}

/**
 * Image load options
 */
export interface LoadImageOptions {
  /** Timeout in milliseconds, default 10000 */
  timeout?: number;
  /** Base path for local images */
  basePath?: string;
}

// Image cache
const imageCache = new Map<string, LoadedImage>();

// Loading promise cache (prevent duplicate requests)
const loadingPromises = new Map<string, Promise<LoadedImage>>();

/**
 * Resolve image path
 *
 * @param src - Original path
 * @param basePath - Base path
 * @returns Resolved full path
 */
export function resolveImagePath(src: string, basePath?: string): string {
  // Return data URL as-is
  if (src.startsWith('data:')) {
    return src;
  }

  // Return absolute URL as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // Relative paths need resolution
  if (basePath) {
    // Remove path traversal attacks
    const sanitizedSrc = src.replace(/\.\.\//g, '').replace(/^\.\//g, '');

    // Ensure basePath ends with /
    const normalizedBase = basePath.endsWith('/') ? basePath : basePath + '/';

    return normalizedBase + sanitizedSrc;
  }

  return src;
}

/**
 * Load single image
 *
 * @param src - Image URL
 * @param options - Load options
 * @returns Load result
 */
export function loadImage(
  src: string,
  options: LoadImageOptions = {}
): Promise<LoadedImage> {
  const { timeout = 10000, basePath } = options;

  // Resolve path
  const resolvedSrc = resolveImagePath(src, basePath);

  // Check cache
  const cached = imageCache.get(resolvedSrc);
  if (cached) {
    return Promise.resolve(cached);
  }

  // Check if already loading
  const loading = loadingPromises.get(resolvedSrc);
  if (loading) {
    return loading;
  }

  // Create load promise
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

      // Don't cache failed results, allow retry
      resolve(result);
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      handleError(`Image load timeout after ${timeout}ms`);
    }, timeout);

    img.onload = handleSuccess;
    img.onerror = () => handleError('Image load failed');

    // Start loading
    img.src = resolvedSrc;
  });

  loadingPromises.set(resolvedSrc, promise);
  return promise;
}

/**
 * Preload multiple images
 *
 * @param srcs - Image URL array
 * @param options - Load options
 * @returns Load results for all images
 */
export async function preloadImages(
  srcs: string[],
  options: LoadImageOptions = {}
): Promise<LoadedImage[]> {
  // Load all images in parallel
  const promises = srcs.map((src) => loadImage(src, options));
  return Promise.all(promises);
}

/**
 * Clear image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}
