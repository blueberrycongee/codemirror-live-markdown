# codemirror-obsidian-mode

> Obsidian-style Live Preview mode for CodeMirror 6

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**⚠️ Work in Progress** - This is an early-stage project. Core functionality is implemented, but more features are coming.

## What is this?

A CodeMirror 6 extension that brings Obsidian's Live Preview mode to your editor:
- Markdown markers (`**`, `*`, `#`, etc.) hide when you're not editing them
- Smooth animations when cursor enters/exits formatted text
- Edit the source directly when needed

## Demo

```bash
cd demo
npm install
npm run dev
```

Open http://localhost:5173 to see it in action.

## Installation

```bash
npm install codemirror-obsidian-mode
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
} from 'codemirror-obsidian-mode';

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

- [ ] Math formulas (KaTeX)
- [ ] Tables
- [ ] Code blocks with syntax highlighting
- [ ] Images
- [ ] Mermaid diagrams

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
