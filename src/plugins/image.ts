/**
 * Image Plugin
 *
 * Implements live preview for Markdown images
 * Shows image preview when cursor is outside image syntax, shows source when inside
 */

import { syntaxTree } from '@codemirror/language';
import { EditorState, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { shouldShowSource } from '../core/shouldShowSource';
import { mouseSelectingField } from '../core/mouseSelecting';
import {
  createImageWidget,
  ImageData,
  ImageOptions,
} from '../widgets/imageWidget';

export type { ImageOptions } from '../widgets/imageWidget';

/**
 * Parse image syntax
 *
 * @param text - Image syntax text
 * @returns Parsed image data, or null
 */
export function parseImageSyntax(text: string): ImageData | null {
  // Match ![alt](url) or ![alt](url "title") or ![alt](url 'title')
  // URL part supports parentheses (greedy match to last parenthesis)
  const match = text.match(/^!\[([^\]]*)\]\((.+?)(?:\s+["']([^"']+)["'])?\)$/);

  if (!match) {
    return null;
  }

  const [, alt, src, title] = match;

  // Check if it's a local image
  const isLocal =
    !src.startsWith('http://') &&
    !src.startsWith('https://') &&
    !src.startsWith('data:');

  return {
    src,
    alt,
    title,
    isLocal,
  };
}

/**
 * Default options
 */
const defaultOptions: Required<ImageOptions> = {
  maxWidth: '100%',
  showAlt: true,
  showLoading: true,
  errorPlaceholder: 'Failed to load image',
  basePath: '',
};

/**
 * Build image decorations
 */
function buildImageDecorations(
  state: EditorState,
  options: Required<ImageOptions>
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const isDrag = state.field(mouseSelectingField, false);

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Image') {
        const from = node.from;
        const to = node.to;

        // Get image syntax text
        const text = state.doc.sliceString(from, to);
        const imageData = parseImageSyntax(text);

        if (!imageData) {
          return;
        }

        // Decide display mode
        const isTouched = shouldShowSource(state, from, to);

        if (!isTouched && !isDrag) {
          // Render mode: show widget
          const widget = createImageWidget(imageData, options);

          decorations.push(
            Decoration.replace({ widget, block: true }).range(from, to)
          );
        } else {
          // Edit mode: add background to image line
          const line = state.doc.lineAt(from);
          decorations.push(
            Decoration.line({ class: 'cm-image-source' }).range(line.from)
          );
        }
      }
    },
  });

  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}

/**
 * Create image StateField
 */
function createImageField(
  options: Required<ImageOptions>
): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildImageDecorations(state, options);
    },

    update(deco, tr) {
      // Rebuild on document or config change
      if (tr.docChanged || tr.reconfigured) {
        return buildImageDecorations(tr.state, options);
      }

      // Rebuild on drag state change
      const isDragging = tr.state.field(mouseSelectingField, false);
      const wasDragging = tr.startState.field(mouseSelectingField, false);

      if (wasDragging && !isDragging) {
        return buildImageDecorations(tr.state, options);
      }

      // Keep unchanged during drag
      if (isDragging) {
        return deco;
      }

      // Rebuild on selection change
      if (tr.selection) {
        return buildImageDecorations(tr.state, options);
      }

      return deco;
    },

    provide: (f) => EditorView.decorations.from(f),
  });
}

// Cache StateField instance
let cachedField: StateField<DecorationSet> | null = null;
let cachedOptions: Required<ImageOptions> | null = null;

/**
 * Image plugin
 *
 * @param options - Configuration options
 * @returns StateField
 *
 * @example
 * ```typescript
 * import { imageField } from 'codemirror-live-markdown';
 *
 * // Use default config
 * extensions: [imageField()]
 *
 * // Custom config
 * extensions: [imageField({
 *   maxWidth: '600px',
 *   showAlt: true,
 *   basePath: '/assets/images/',
 * })]
 * ```
 */
export function imageField(options?: ImageOptions): StateField<DecorationSet> {
  const mergedOptions = { ...defaultOptions, ...options };

  // Check if cache can be reused
  if (
    cachedField &&
    cachedOptions &&
    cachedOptions.maxWidth === mergedOptions.maxWidth &&
    cachedOptions.showAlt === mergedOptions.showAlt &&
    cachedOptions.showLoading === mergedOptions.showLoading &&
    cachedOptions.errorPlaceholder === mergedOptions.errorPlaceholder &&
    cachedOptions.basePath === mergedOptions.basePath
  ) {
    return cachedField;
  }

  // Create new StateField
  cachedField = createImageField(mergedOptions);
  cachedOptions = mergedOptions;

  return cachedField;
}
