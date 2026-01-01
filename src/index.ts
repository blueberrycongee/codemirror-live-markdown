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

// Plugins
export { livePreviewPlugin } from './plugins/livePreview';
export { markdownStylePlugin } from './plugins/markdownStyle';

// Theme
export { editorTheme } from './theme/default';

// Re-export types from CodeMirror for convenience
export type { Extension } from '@codemirror/state';
export type { EditorView } from '@codemirror/view';
