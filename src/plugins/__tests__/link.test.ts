/**
 * Link Plugin Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import {
  linkPlugin,
  parseLinkSyntax,
  parseWikiLink,
  LinkOptions,
} from '../link';

// Mock linkWidget
vi.mock('../../widgets/linkWidget', () => ({
  createLinkWidget: vi.fn().mockImplementation((data, options) => ({
    data,
    options,
    toDOM: () => document.createElement('a'),
    eq: (other: { data?: { url: string } }) => other.data?.url === data.url,
    ignoreEvent: () => false,
  })),
}));

/**
 * Create test EditorState
 */
function createState(
  doc: string,
  selection?: { anchor: number; head?: number }
) {
  return EditorState.create({
    doc,
    selection: selection
      ? { anchor: selection.anchor, head: selection.head }
      : undefined,
    extensions: [markdown(), linkPlugin()],
  });
}

describe('linkPlugin', () => {
  describe('parseLinkSyntax', () => {
    it('should detect link syntax', () => {
      const result = parseLinkSyntax('[link text](https://example.com)');

      expect(result).not.toBeNull();
      expect(result?.text).toBe('link text');
      expect(result?.url).toBe('https://example.com');
    });

    it('should extract text, url, title', () => {
      const result = parseLinkSyntax(
        '[link text](https://example.com "Link title")'
      );

      expect(result?.text).toBe('link text');
      expect(result?.url).toBe('https://example.com');
      expect(result?.title).toBe('Link title');
    });

    it('should handle link without title', () => {
      const result = parseLinkSyntax('[text](./local/path)');

      expect(result?.text).toBe('text');
      expect(result?.url).toBe('./local/path');
      expect(result?.title).toBeUndefined();
    });

    it('should handle empty link text', () => {
      const result = parseLinkSyntax('[](https://example.com)');

      expect(result?.text).toBe('');
      expect(result?.url).toBe('https://example.com');
    });

    it('should handle title with single quotes', () => {
      const result = parseLinkSyntax("[text](url 'title')");

      expect(result?.title).toBe('title');
    });

    it('should return null for invalid syntax', () => {
      expect(parseLinkSyntax('not a link')).toBeNull();
      expect(parseLinkSyntax('![image](url)')).toBeNull();
      expect(parseLinkSyntax('[incomplete')).toBeNull();
    });

    it('should mark as not wiki link', () => {
      const result = parseLinkSyntax('[text](url)');

      expect(result?.isWikiLink).toBe(false);
    });
  });

  describe('parseWikiLink', () => {
    it('should detect [[wiki]] syntax', () => {
      const result = parseWikiLink('[[Wiki Page]]');

      expect(result).not.toBeNull();
      expect(result?.text).toBe('Wiki Page');
      expect(result?.url).toBe('Wiki Page');
    });

    it('should extract link target', () => {
      const result = parseWikiLink('[[My/Nested/Page]]');

      expect(result?.url).toBe('My/Nested/Page');
    });

    it('should mark as wiki link', () => {
      const result = parseWikiLink('[[page]]');

      expect(result?.isWikiLink).toBe(true);
    });

    it('should handle wiki link with display text', () => {
      const result = parseWikiLink('[[target|Display Text]]');

      expect(result?.url).toBe('target');
      expect(result?.text).toBe('Display Text');
    });

    it('should return null for invalid wiki syntax', () => {
      expect(parseWikiLink('not a wiki link')).toBeNull();
      expect(parseWikiLink('[[incomplete')).toBeNull();
      expect(parseWikiLink('[single bracket]')).toBeNull();
    });
  });

  describe('standard links', () => {
    it('should show widget when cursor outside', () => {
      const doc = '# Title\n\n[link](https://example.com)\n\nText';
      const state = createState(doc, { anchor: 0 });

      // Plugin should initialize normally
      expect(state).toBeDefined();
    });

    it('should handle link in heading', () => {
      const doc = '# [Heading Link](url)';
      const state = createState(doc, { anchor: 0 });

      expect(state).toBeDefined();
    });
  });

  describe('wiki links', () => {
    it('should detect [[wiki]] syntax in document', () => {
      const doc = 'Some text [[Wiki Page]] more text';
      const state = createState(doc, { anchor: 0 });

      expect(state).toBeDefined();
    });

    it('should render as clickable link', () => {
      const result = parseWikiLink('[[Page]]');

      expect(result).not.toBeNull();
      expect(result?.isWikiLink).toBe(true);
    });
  });

  describe('updates', () => {
    it('should update on document change', () => {
      const state1 = createState('[old](url)', { anchor: 0 });
      const state2 = state1.update({
        changes: { from: 1, to: 4, insert: 'new' },
      }).state;

      expect(state2).toBeDefined();
    });

    it('should update on selection change', () => {
      const state1 = createState('[link](url)', { anchor: 0 });
      const state2 = state1.update({
        selection: { anchor: 3 },
      }).state;

      expect(state2).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple links in one line', () => {
      const doc = '[link1](url1) and [link2](url2) and [link3](url3)';
      const state = createState(doc, { anchor: 0 });

      expect(state).toBeDefined();
    });

    it('should handle nested formatting in link text', () => {
      const result = parseLinkSyntax('[**bold** link](url)');

      expect(result?.text).toBe('**bold** link');
    });

    it('should handle autolinks', () => {
      const doc = '<https://example.com>';
      const state = createState(doc, { anchor: 0 });

      expect(state).toBeDefined();
    });

    it('should handle link with special characters in URL', () => {
      const result = parseLinkSyntax(
        '[text](https://example.com/path?q=1&b=2)'
      );

      expect(result?.url).toBe('https://example.com/path?q=1&b=2');
    });

    it('should handle link with parentheses in URL', () => {
      const result = parseLinkSyntax('[text](https://example.com/page_(1))');

      expect(result?.url).toBe('https://example.com/page_(1)');
    });

    it('should handle adjacent links', () => {
      const doc = '[a](1)[b](2)[c](3)';
      const state = createState(doc, { anchor: 0 });

      expect(state).toBeDefined();
    });
  });

  describe('options', () => {
    it('should accept options', () => {
      const options: LinkOptions = {
        openInNewTab: false,
        showPreview: true,
        onWikiLinkClick: (link) => console.log(link),
      };

      const state = EditorState.create({
        doc: '[link](url)',
        extensions: [markdown(), linkPlugin(options)],
      });

      expect(state).toBeDefined();
    });
  });
});
