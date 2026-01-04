# codemirror-live-markdown

> Live Preview mode for CodeMirror 6 - inspired by Obsidian

[![npm version](https://img.shields.io/npm/v/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![npm downloads](https://img.shields.io/npm/dm/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

English | [简体中文](./README.zh-CN.md)

**⚠️ Work in Progress** - This is an early-stage project. Core functionality is implemented, but more features are coming.

**[🚀 Live Demo](https://codemirror-live-markdown.vercel.app/)** - Try it online!

## Features

- ✨ **Live Preview** - Hide Markdown markers when not editing
- 🎯 **Smart Display** - Markers smoothly appear when cursor enters, edit directly
- 🎨 **Smooth Animations** - CSS transitions for a polished experience
- 📝 **Multiple Elements** - Bold, italic, headers, lists, quotes, and more
- 🧮 **Math Formulas** - KaTeX rendering for inline and block math (v0.2.0+)
- 📊 **Tables** - Live preview for Markdown tables (v0.3.0+)
- 💻 **Code Blocks** - Syntax highlighting with lowlight (v0.4.0+)
- ⚡ **Performance Optimized** - Position caching, drag selection optimization
- 🔧 **TypeScript** - Full type definitions included

## Demo

**Online:** https://codemirror-live-markdown.vercel.app/

**Local:**
```bash
cd demo
npm install
npm run dev
```

Open http://localhost:5173

## Installation

```bash
npm install codemirror-live-markdown@alpha
```

**Peer dependencies required:**
```bash
npm install @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/language @lezer/markdown
```

**Optional: For math formula support (v0.2.0+):**
```bash
npm install katex
```

**Optional: For code block syntax highlighting (v0.4.0+):**
```bash
npm install lowlight
```

## Quick Start

```typescript
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { Table } from '@lezer/markdown';
import {
  livePreviewPlugin,
  markdownStylePlugin,
  mathPlugin,
  blockMathField,
  tableField,
  codeBlockField,
  mouseSelectingField,
  collapseOnSelectionFacet,
  editorTheme,
  setMouseSelecting,
} from 'codemirror-live-markdown';

const state = EditorState.create({
  doc: '# Hello\n\nThis is **bold** and *italic* text.',
  extensions: [
    markdown({ extensions: [Table] }),
    collapseOnSelectionFacet.of(true),
    mouseSelectingField,
    livePreviewPlugin,
    markdownStylePlugin,
    mathPlugin,       // Optional: Inline math support
    blockMathField,   // Optional: Block math support
    tableField,       // Optional: Table support
    codeBlockField(), // Optional: Code block syntax highlighting
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

## How It Works

The core is the `shouldShowSource(state, from, to)` function that decides whether to show markers based on cursor position:

```
Document: "Hello **world** test"
Position:  0     6    13   18

Scenario 1: Cursor at position 5 (after "Hello")
→ shouldShowSource(state, 6, 15) = false
→ Hide **, show bold effect

Scenario 2: Cursor at position 10 (inside "world")
→ shouldShowSource(state, 6, 15) = true
→ Show **, allow editing
```

**Animation Techniques:**
- **Inline Markers** (bold, italic): Use `max-width: 0` → `max-width: 4ch` transition
- **Block Markers** (headers, lists): Use `fontSize: 0.01em` → `fontSize: 1em` transition

## API

### Extensions

- `livePreviewPlugin` - Main Live Preview plugin
- `markdownStylePlugin` - Markdown styling (headers, bold, italic, etc.)
- `mathPlugin` - Inline math formula rendering (requires KaTeX)
- `blockMathField` - Block math formula rendering (requires KaTeX)
- `tableField` - Table rendering (requires `@lezer/markdown` Table extension)
- `codeBlockField(options?)` - Code block syntax highlighting (requires lowlight)
- `editorTheme` - Default theme with animations

### State Management

- `collapseOnSelectionFacet` - Enable/disable Live Preview
- `mouseSelectingField` - Track drag selection state
- `setMouseSelecting` - Effect to set drag state

### Utilities

- `shouldShowSource(state, from, to)` - Core decision function
- `renderMath(source, displayMode)` - Render math formula with KaTeX
- `clearMathCache()` - Clear math rendering cache
- `highlightCode(code, lang?)` - Highlight code with lowlight
- `registerLanguage(name, syntax)` - Register additional language for highlighting
- `isLanguageRegistered(name)` - Check if a language is registered

## Math Formulas (v0.2.0+)

**Inline math:** Use backtick-dollar syntax
```markdown
The equation `$E = mc^2$` is famous.
```

**Block math:** Use fenced code block with `math` language
````markdown
```math
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
```
````

**Requirements:**
1. Install KaTeX: `npm install katex`
2. Include KaTeX CSS in your HTML:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
```
3. Add `mathPlugin` and `blockMathField` to your extensions

**Features:**
- Click rendered formula to edit
- Smooth transition between render and edit modes
- Error handling for invalid LaTeX
- Rendering cache for performance

## Tables (v0.3.0+)

Tables are rendered as HTML when cursor is outside:

```markdown
| Name  | Age | City     |
|-------|-----|----------|
| Alice | 25  | Beijing  |
| Bob   | 30  | Shanghai |
```

**Alignment support:**
```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| L    |   C    |     R |
```

**Requirements:**
1. Enable GFM Table extension:
```typescript
import { markdown } from '@codemirror/lang-markdown';
import { Table } from '@lezer/markdown';

markdown({ extensions: [Table] })
```
2. Add `tableField` to your extensions

**Features:**
- Click rendered table to edit
- Smooth transition between render and edit modes
- Support for left, center, right alignment
- Edit mode with source highlighting

## Code Blocks (v0.4.0+)

Code blocks are rendered with syntax highlighting when cursor is outside:

````markdown
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```
````

**Requirements:**
1. Install lowlight: `npm install lowlight`
2. Add `codeBlockField()` to your extensions

**Configuration options:**
```typescript
codeBlockField({
  lineNumbers: false,      // Show line numbers (default: false)
  copyButton: true,        // Show copy button (default: true)
  defaultLanguage: 'text', // Default language when not specified
})
```

**Register additional languages:**
```typescript
import { registerLanguage } from 'codemirror-live-markdown';
import rust from 'highlight.js/lib/languages/rust';

registerLanguage('rust', rust);
```

**Features:**
- Click rendered code block to edit
- Syntax highlighting for 30+ common languages
- Copy button with success feedback
- Optional line numbers
- Graceful fallback when lowlight is not installed

**Supported languages (built-in):**
JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, SQL, HTML, CSS, JSON, YAML, Markdown, Bash, and more.

## Customization

Customize colors using CSS variables:

```css
:root {
  --foreground: 0 0% 0%;
  --primary: 221 83% 53%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  
  /* Markdown-specific */
  --md-heading: var(--foreground);
  --md-bold: var(--foreground);
  --md-italic: var(--foreground);
  --md-link: var(--primary);
}
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed version plan.

**Next up:**
- [x] v0.2.0-alpha: Math formulas (KaTeX) ✅
- [x] v0.3.0-alpha: Tables ✅
- [x] v0.4.0-alpha: Code blocks with syntax highlighting ✅
- [ ] v0.5.0-alpha: Images & Links
- [ ] v1.0.0: Stable release

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint
```

## Contributing

Contributions are welcome! Please check out the [GitHub Issues](https://github.com/blueberrycongee/codemirror-live-markdown/issues).

## License

MIT © [blueberrycongee](https://github.com/blueberrycongee)

## Credits

Inspired by [Obsidian](https://obsidian.md/)'s Live Preview mode.
