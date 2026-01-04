/**
 * Image Widget
 *
 * Renders Markdown image preview with loading state and error handling
 */

import { WidgetType } from '@codemirror/view';
import { loadImage } from '../utils/imageLoader';

/**
 * Image data interface
 */
export interface ImageData {
  /** Image source URL */
  src: string;
  /** Alt text */
  alt: string;
  /** Title */
  title?: string;
  /** Whether it's a local image */
  isLocal: boolean;
}

/**
 * Image options interface
 */
export interface ImageOptions {
  /** Max width, default '100%' */
  maxWidth?: string;
  /** Whether to show alt text, default true */
  showAlt?: boolean;
  /** Whether to show loading state, default true */
  showLoading?: boolean;
  /** Placeholder for failed image load */
  errorPlaceholder?: string;
  /** Base path for local images */
  basePath?: string;
}

/**
 * Image Widget class
 */
export class ImageWidget extends WidgetType {
  constructor(
    readonly data: ImageData,
    readonly options: ImageOptions
  ) {
    super();
  }

  /**
   * Check if two widgets are equal
   */
  eq(other: ImageWidget): boolean {
    return (
      other.data.src === this.data.src &&
      other.data.alt === this.data.alt &&
      other.data.title === this.data.title
    );
  }

  /**
   * Render to DOM element
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

    // Container
    const container = document.createElement('div');
    container.className = 'cm-image-widget';

    // Show loading state
    if (showLoading) {
      const loading = document.createElement('div');
      loading.className = 'cm-image-loading';
      loading.innerHTML = `
        <span class="cm-image-spinner"></span>
        <span>Loading...</span>
      `;
      container.appendChild(loading);
    }

    // Load image asynchronously
    loadImage(src, { basePath }).then((result) => {
      // Remove loading state
      const loading = container.querySelector('.cm-image-loading');
      if (loading) {
        loading.remove();
      }

      if (result.loaded) {
        // Create image element
        const img = document.createElement('img');
        img.src = result.src;
        img.alt = alt;
        img.title = title || '';
        img.style.maxWidth = maxWidth;
        img.draggable = false;

        container.appendChild(img);

        // Show alt text
        if (showAlt && alt) {
          const altEl = document.createElement('div');
          altEl.className = 'cm-image-alt';
          altEl.textContent = alt;
          container.appendChild(altEl);
        }
      } else {
        // Show error state
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
   * Whether to ignore events
   *
   * Return false to allow click to enter edit mode
   */
  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Create image widget
 */
export function createImageWidget(
  data: ImageData,
  options: ImageOptions
): ImageWidget {
  return new ImageWidget(data, options);
}
