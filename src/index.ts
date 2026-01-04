/**
 * codemirror-obsidian-mode
 * 
 * Obsidian-style Live Preview mode for CodeMirror 6
 * 
 * @packageDocumentation
 */

// Core
export { collapseOnSelectionFacet } from './core/facets';
export { mouseSelectingField, setMouseSelecting } from './core/mouseSelecting';
export { shouldShowSource } from './core/shouldShowSource';
export { checkUpdateAction } from './core/pluginUpdateHelper';
export type { UpdateAction } from './core/pluginUpdateHelper';

// Plugins
export { livePreviewPlugin } from './plugins/livePreview';
export { markdownStylePlugin } from './plugins/markdownStyle';
export { mathPlugin, blockMathField } from './plugins/math';
export { tableField } from './plugins/table';
export { codeBlockField } from './plugins/codeBlock';
export type { CodeBlockOptions } from './plugins/codeBlock';
export { imageField } from './plugins/image';
export type { ImageOptions } from './plugins/image';
export { linkPlugin } from './plugins/link';
export type { LinkOptions } from './plugins/link';

// Theme
export { editorTheme } from './theme/default';

// Utils
export { renderMath, clearMathCache } from './utils/mathCache';
export { highlightCode, registerLanguage, isLanguageRegistered } from './utils/codeHighlight';
export type { HighlightResult } from './utils/codeHighlight';
export { loadImage, preloadImages, clearImageCache, resolveImagePath } from './utils/imageLoader';
export type { LoadedImage, LoadImageOptions } from './utils/imageLoader';

// Re-export types from CodeMirror for convenience
export type { Extension } from '@codemirror/state';
export type { EditorView } from '@codemirror/view';
