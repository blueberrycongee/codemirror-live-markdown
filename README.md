# codemirror-live-markdown

> Live Preview mode for CodeMirror 6 - inspired by Obsidian

[![npm version](https://img.shields.io/npm/v/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![npm downloads](https://img.shields.io/npm/dm/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**⚠️ Work in Progress** - This is an early-stage project. Core functionality is implemented, but more features are coming.

## What is this?

A CodeMirror 6 extension that brings Live Preview editing to Markdown:
- Markdown markers (`**`, `*`, `#`, etc.) hide when you're not editing them
- Smooth animations when cursor enters/exits formatted text
- Edit the source directly when needed

Inspired by Obsidian's Live Preview mode.

## Demo

```bash
cd demo
npm install
npm run dev
```

Open http://localhost:5173 to see it in action.

## Installation

```bash
npm install codemirror-live-markdown
```

**Peer dependencies:**
```bash
npm install @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/language @lezer/markdown
```

## Quick Start

```typescript
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import {
  livePreviewPlugin,
  markdownStylePlugin,
  mouseSelectingField,
  collapseOnSelectionFacet,
  editorTheme,
  setMouseSelecting,
} from 'codemirror-live-markdown';

const state = EditorState.create({
  doc: '# Hello\n\nThis is **bold** text.',
  extensions: [
    markdown(),
    collapseOnSelectionFacet.of(true),
    mouseSelectingField,
    livePreviewPlugin,
    markdownStylePlugin,
    editorTheme,
  ],
});

const view = new EditorView({
  state,
  parent: document.getElementById('editor')!,
});

// Required: Setup drag selection detection
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});

document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});
```

## Current Features

- ✅ Bold, italic, strikethrough, inline code
- ✅ Headers (H1-H6)
- ✅ Lists and quotes
- ✅ Smooth animations
- ✅ Drag selection optimization

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed version plan.

**Next up:**
- [ ] v0.2.0-alpha: Math formulas (KaTeX)
- [ ] v0.3.0-alpha: Tables
- [ ] v0.4.0-alpha: Code blocks with syntax highlighting
- [ ] v0.5.0-alpha: Images & Links
- [ ] v1.0.0: Stable release

## Development

```bash
npm install
npm run build    # Build the package
npm run dev      # Watch mode
npm test         # Run tests
```

## How It Works

The core is the `shouldShowSource(state, from, to)` function that decides whether to show markers or hide them based on cursor position. See [CODEMIRROR_LIVE_PREVIEW_DESIGN.md](./CODEMIRROR_LIVE_PREVIEW_DESIGN.md) for details.

## License

MIT

## Credits

Inspired by [Obsidian](https://obsidian.md/)'s Live Preview mode.
