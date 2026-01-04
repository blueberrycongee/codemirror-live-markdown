/**
 * Code Highlighting Utility
 *
 * Wraps lowlight to provide syntax highlighting functionality
 * Supports on-demand language loading with graceful degradation
 */

import type { LanguageFn } from 'highlight.js';

/**
 * Highlight result interface
 */
export interface HighlightResult {
  /** Highlighted HTML string */
  html: string;
  /** Language identifier */
  language: string;
  /** Whether the language was auto-detected */
  detected: boolean;
}

// lowlight instance (lazy initialization)
let lowlightInstance: any = null;
let lowlightAvailable: boolean | null = null;

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert HAST node to HTML string
 */
function hastToHtml(node: any): string {
  if (!node) return '';

  if (node.type === 'text') {
    return escapeHtml(node.value || '');
  }

  if (node.type === 'element') {
    const tag = node.tagName;
    const classes = node.properties?.className?.join(' ') || '';
    const classAttr = classes ? ` class="${classes}"` : '';
    const children = (node.children || []).map(hastToHtml).join('');
    return `<${tag}${classAttr}>${children}</${tag}>`;
  }

  if (node.type === 'root') {
    return (node.children || []).map(hastToHtml).join('');
  }

  return '';
}

// Cached lowlight module
let lowlightModule: { createLowlight: any; common: any } | null = null;

// Try to load lowlight module
async function loadLowlightModule(): Promise<boolean> {
  if (lowlightModule !== null) {
    return true;
  }
  try {
    // Dynamic import for ESM module
    const mod = await import('lowlight');
    lowlightModule = mod;
    return true;
  } catch {
    return false;
  }
}

// Synchronous initialization (for tests and first call)
function initLowlightSync(): boolean {
  if (lowlightAvailable !== null) {
    return lowlightAvailable;
  }

  // If module is already loaded, use it
  if (lowlightModule) {
    try {
      lowlightInstance = lowlightModule.createLowlight(lowlightModule.common);
      lowlightAvailable = true;
      return true;
    } catch {
      lowlightAvailable = false;
      return false;
    }
  }

  // Try synchronous require (may work in some environments)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createLowlight, common } = require('lowlight');
    lowlightInstance = createLowlight(common);
    lowlightAvailable = true;
    return true;
  } catch {
    // If sync loading fails, mark as unavailable
    // Async loading will try in background
    lowlightAvailable = false;
    return false;
  }
}

// Async initialization (recommended)
async function initLowlightAsync(): Promise<boolean> {
  if (lowlightAvailable === true && lowlightInstance) {
    return true;
  }

  const loaded = await loadLowlightModule();
  if (!loaded || !lowlightModule) {
    lowlightAvailable = false;
    return false;
  }

  try {
    lowlightInstance = lowlightModule.createLowlight(lowlightModule.common);
    lowlightAvailable = true;
    return true;
  } catch {
    lowlightAvailable = false;
    return false;
  }
}

/**
 * Reset highlighter (for testing)
 */
export function resetHighlighter(): void {
  lowlightInstance = null;
  lowlightAvailable = null;
  // Don't auto-initialize, let tests control initialization timing
}

/**
 * Initialize highlighter asynchronously
 * Recommended to call at application startup
 */
export async function initHighlighter(): Promise<boolean> {
  return initLowlightAsync();
}

/**
 * Check if highlighter is available
 */
export function isHighlighterAvailable(): boolean {
  return lowlightAvailable === true && lowlightInstance !== null;
}

/**
 * Highlight code
 *
 * @param code - Source code
 * @param lang - Language identifier (optional, auto-detect if not provided)
 * @returns Highlight result
 */
export function highlightCode(code: string, lang?: string): HighlightResult {
  // Return early for empty code
  if (!code) {
    return {
      html: '',
      language: lang || 'text',
      detected: false,
    };
  }

  // Ensure lowlight is initialized
  if (!initLowlightSync()) {
    // lowlight not available, return escaped plain text
    return {
      html: escapeHtml(code),
      language: lang || 'text',
      detected: false,
    };
  }

  try {
    if (lang) {
      // Specified language
      if (lowlightInstance.registered(lang)) {
        const result = lowlightInstance.highlight(lang, code);
        return {
          html: hastToHtml(result),
          language: lang,
          detected: false,
        };
      } else {
        // Language not registered, return plain text
        return {
          html: escapeHtml(code),
          language: lang,
          detected: false,
        };
      }
    } else {
      // Auto-detect language
      const result = lowlightInstance.highlightAuto(code);
      return {
        html: hastToHtml(result),
        language: result.data?.language || 'text',
        detected: true,
      };
    }
  } catch {
    // Highlighting failed, return plain text
    return {
      html: escapeHtml(code),
      language: lang || 'text',
      detected: false,
    };
  }
}

/**
 * Register a language
 *
 * @param name - Language name
 * @param syntax - Language definition function
 */
export function registerLanguage(name: string, syntax: LanguageFn): void {
  if (!initLowlightSync()) {
    console.warn('[codeHighlight] lowlight not available, cannot register language');
    return;
  }

  try {
    lowlightInstance.register({ [name]: syntax });
  } catch (error) {
    console.warn(`[codeHighlight] Failed to register language "${name}":`, error);
  }
}

/**
 * Check if a language is registered
 *
 * @param name - Language name
 * @returns Whether the language is registered
 */
export function isLanguageRegistered(name: string): boolean {
  if (!initLowlightSync()) {
    return false;
  }

  return lowlightInstance.registered(name);
}
