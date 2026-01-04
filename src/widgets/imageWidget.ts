/**
 * 图片 Widget
 *
 * 渲染 Markdown 图片预览，支持加载状态和错误处理
 */

import { WidgetType } from '@codemirror/view';
import { loadImage } from '../utils/imageLoader';

/**
 * 图片数据接口
 */
export interface ImageData {
  /** 图片源地址 */
  src: string;
  /** 替代文本 */
  alt: string;
  /** 标题 */
  title?: string;
  /** 是否为本地图片 */
  isLocal: boolean;
}

/**
 * 图片选项接口
 */
export interface ImageOptions {
  /** 最大宽度，默认 '100%' */
  maxWidth?: string;
  /** 是否显示 alt 文本，默认 true */
  showAlt?: boolean;
  /** 是否显示加载状态，默认 true */
  showLoading?: boolean;
  /** 图片加载失败时的占位符 */
  errorPlaceholder?: string;
  /** 本地图片基础路径 */
  basePath?: string;
}

/**
 * 图片 Widget 类
 */
export class ImageWidget extends WidgetType {
  constructor(
    readonly data: ImageData,
    readonly options: ImageOptions
  ) {
    super();
  }

  /**
   * 判断两个 Widget 是否相等
   */
  eq(other: ImageWidget): boolean {
    return (
      other.data.src === this.data.src &&
      other.data.alt === this.data.alt &&
      other.data.title === this.data.title
    );
  }

  /**
   * 渲染为 DOM 元素
   */
  toDOM(): HTMLElement {
    const { src, alt, title } = this.data;
    const {
      maxWidth = '100%',
      showAlt = true,
      showLoading = true,
      errorPlaceholder = 'Failed to load image',
      basePath = '',
    } = this.options;

    // 容器
    const container = document.createElement('div');
    container.className = 'cm-image-widget';

    // 显示加载状态
    if (showLoading) {
      const loading = document.createElement('div');
      loading.className = 'cm-image-loading';
      loading.innerHTML = `
        <span class="cm-image-spinner"></span>
        <span>Loading...</span>
      `;
      container.appendChild(loading);
    }

    // 异步加载图片
    loadImage(src, { basePath }).then((result) => {
      // 移除加载状态
      const loading = container.querySelector('.cm-image-loading');
      if (loading) {
        loading.remove();
      }

      if (result.loaded) {
        // 创建图片元素
        const img = document.createElement('img');
        img.src = result.src;
        img.alt = alt;
        img.title = title || '';
        img.style.maxWidth = maxWidth;
        img.draggable = false;

        container.appendChild(img);

        // 显示 alt 文本
        if (showAlt && alt) {
          const altEl = document.createElement('div');
          altEl.className = 'cm-image-alt';
          altEl.textContent = alt;
          container.appendChild(altEl);
        }
      } else {
        // 显示错误状态
        const error = document.createElement('div');
        error.className = 'cm-image-error';
        error.innerHTML = `
          <span class="cm-image-error-icon">⚠</span>
          <span>${errorPlaceholder}</span>
        `;
        container.appendChild(error);
      }
    });

    return container;
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
 * 创建图片 Widget
 */
export function createImageWidget(
  data: ImageData,
  options: ImageOptions
): ImageWidget {
  return new ImageWidget(data, options);
}
