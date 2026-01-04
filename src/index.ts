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

// Theme
export { editorTheme } from './theme/default';

// Utils
export { renderMath, clearMathCache } from './utils/mathCache';

// Re-export types from CodeMirror for convenience
export type { Extension } from '@codemirror/state';
export type { EditorView } from '@codemirror/view';
