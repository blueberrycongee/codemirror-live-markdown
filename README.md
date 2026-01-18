# codemirror-live-markdown

[![npm version](https://img.shields.io/npm/v/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![npm downloads](https://img.shields.io/npm/dm/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![CI](https://github.com/blueberrycongee/codemirror-live-markdown/actions/workflows/ci.yml/badge.svg)](https://github.com/blueberrycongee/codemirror-live-markdown/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Obsidian-style Live Preview for CodeMirror 6** — A modular plugin collection that hides Markdown syntax when you're not editing it.

English | [简体中文](./README.zh-CN.md)

[Live Demo](https://codemirror-live-markdown.vercel.app/) · [Documentation](#documentation) · [Roadmap](./ROADMAP.md)

---

## Why This Library?

Most Markdown editors force you to choose: either see raw syntax or rendered output. Live Preview gives you both — syntax fades in only when your cursor enters, letting you edit naturally while seeing formatted results.

**Key differentiators:**
- **Modular** — Import only what you need (math? tables? code blocks?)
- **Zero lock-in** — Works with any CodeMirror 6 setup
- **Lightweight** — No heavy dependencies forced on you

## Features

| Feature | Description | Since |
|---------|-------------|-------|
| ✨ Live Preview | Hide markers when not editing | v0.1.0 |
| 📝 Inline Formatting | Bold, italic, strikethrough, inline code | v0.1.0 |
| 📑 Block Elements | Headers, lists, blockquotes | v0.1.0 |
| 🧮 Math | KaTeX rendering (inline & block) | v0.2.0 |
| 📊 Tables | GFM table rendering | v0.3.0 |
| 💻 Code Blocks | Syntax highlighting via lowlight | v0.4.0 |
| 🖼️ Images | Image preview with loading states | v0.5.0 |
| 🔗 Links | Clickable link rendering | v0.5.0 |
| 🧩 Editable Tables (Advanced) | Optional table editor with inline cells + source toggle | v0.5.1 |

## Installation

```bash
npm install codemirror-live-markdown
```

**Peer dependencies:**
```bash
npm install @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/language @lezer/markdown
```

**Optional dependencies** (install only what you need):
```bash
npm install katex      # For math formulas
npm install lowlight   # For code syntax highlighting
```

## Quick Start

```typescript
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import {
  livePreviewPlugin,
  markdownStylePlugin,
  editorTheme,
  mouseSelectingField,
  collapseOnSelectionFacet,
  setMouseSelecting,
} from 'codemirror-live-markdown';

const view = new EditorView({
  state: EditorState.create({
    doc: '# Hello World\n\nThis is **bold** and *italic* text.',
    extensions: [
      markdown(),
      collapseOnSelectionFacet.of(true),
      mouseSelectingField,
      livePreviewPlugin,
      markdownStylePlugin,
      editorTheme,
    ],
  }),
  parent: document.getElementById('editor')!,
});

// Required: Track mouse selection state
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});
document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});
```

## Documentation

### Adding Optional Features

Each feature is a separate plugin. Import and add only what you need:

```typescript
import { Table } from '@lezer/markdown';
import {
  mathPlugin,
  blockMathField,
  tableField,
  tableEditorPlugin,
  codeBlockField,
  imageField,
  linkPlugin,
} from 'codemirror-live-markdown';

const extensions = [
  markdown({ extensions: [Table] }), // Enable GFM tables in parser
  // ... core extensions from Quick Start
  
  // Optional features:
  mathPlugin,                        // Inline math: `$E=mc^2$`
  blockMathField,                    // Block math: ```math
  tableField,                        // GFM tables
  tableEditorPlugin(),               // Editable tables with source toggle
  codeBlockField({ copyButton: true }), // Code blocks with syntax highlighting
  imageField(),                      // Image preview
  linkPlugin(),                      // Link rendering
];
```

### Code Block Options

```typescript
codeBlockField({
  lineNumbers: false,      // Show line numbers
  copyButton: true,        // Show copy button
  defaultLanguage: 'text', // Fallback language
})
```

### Registering Additional Languages

```typescript
import { registerLanguage, initHighlighter } from 'codemirror-live-markdown';
import rust from 'highlight.js/lib/languages/rust';

// Initialize highlighter (required before first use)
await initHighlighter();

// Register additional languages
registerLanguage('rust', rust);
```

### Theming

Customize with CSS variables:

```css
:root {
  --md-heading: #1a1a1a;
  --md-bold: #1a1a1a;
  --md-italic: #1a1a1a;
  --md-link: #2563eb;
  --md-code-bg: #f5f5f5;
}
```

## API Reference

### Core Extensions

| Export | Description |
|--------|-------------|
| `livePreviewPlugin` | Main live preview behavior |
| `markdownStylePlugin` | Styling for headers, bold, italic, etc. |
| `editorTheme` | Default theme with animations |
| `mouseSelectingField` | Tracks drag selection state |
| `collapseOnSelectionFacet` | Enable/disable live preview |

### Feature Extensions

| Export | Description | Requires |
|--------|-------------|----------|
| `mathPlugin` | Inline math rendering | `katex` |
| `blockMathField` | Block math rendering | `katex` |
| `tableField` | Table rendering | `@lezer/markdown` Table |
| `tableEditorPlugin()` | Editable table rendering | `@lezer/markdown` Table |
| `codeBlockField(options?)` | Code block highlighting | `lowlight` |
| `imageField(options?)` | Image preview | — |
| `linkPlugin(options?)` | Link rendering | — |

### Utilities

| Export | Description |
|--------|-------------|
| `shouldShowSource(state, from, to)` | Check if range should show source |
| `renderMath(source, displayMode)` | Render LaTeX to HTML |
| `highlightCode(code, lang?)` | Highlight code string |
| `initHighlighter()` | Initialize syntax highlighter |
| `isHighlighterAvailable()` | Check if highlighter is ready |

## Development

```bash
git clone https://github.com/blueberrycongee/codemirror-live-markdown.git
cd codemirror-live-markdown
npm install
npm run dev      # Watch mode
npm test         # Run tests
npm run build    # Production build
```

**Run the demo:**
```bash
cd demo
npm install
npm run dev
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](./LICENSE) © [blueberrycongee](https://github.com/blueberrycongee)

## Acknowledgments

- Inspired by [Obsidian](https://obsidian.md/)'s Live Preview mode
- Built on [CodeMirror 6](https://codemirror.net/)
- Syntax highlighting powered by [lowlight](https://github.com/wooorm/lowlight)
- Math rendering by [KaTeX](https://katex.org/)
