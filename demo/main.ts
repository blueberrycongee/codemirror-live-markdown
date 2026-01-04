import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { Table } from '@lezer/markdown';

// Import from npm package
import {
  livePreviewPlugin,
  markdownStylePlugin,
  mathPlugin,
  blockMathField,
  tableField,
  codeBlockField,
  imageField,
  linkPlugin,
  mouseSelectingField,
  collapseOnSelectionFacet,
  editorTheme,
  setMouseSelecting,
} from 'codemirror-live-markdown';

// Initial document content
const initialDoc = `# Welcome to Live Preview! 🎉

This is a demonstration of **Live Preview** mode for CodeMirror 6, inspired by Obsidian.

## What is Live Preview?

Live Preview is a hybrid editing mode that combines the best of both worlds:
- **WYSIWYG** (What You See Is What You Get) - formatted text looks nice
- **Source editing** - you can still edit the raw Markdown

## Try it yourself!

Move your cursor into any of these formatted elements:

- **Bold text** - The \`**\` markers will smoothly appear
- *Italic text* - The \`*\` markers slide in
- ~~Strikethrough~~ - The \`~~\` markers show up
- \`inline code\` - The backticks become visible

### Math Formulas ✨

**Inline math:** The famous equation \`$E = mc^2$\` shows energy-mass equivalence.

**Block math:**

\`\`\`math
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
\`\`\`

**More examples:**

- Pythagorean theorem: \`$a^2 + b^2 = c^2$\`
- Quadratic formula: \`$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$\`

\`\`\`math
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
\`\`\`

Click on any formula to edit it!

### Tables 📊

Tables are rendered as HTML when you're not editing them:

| Name  | Age | City     |
|-------|-----|----------|
| Alice | 25  | Beijing  |
| Bob   | 30  | Shanghai |

Try clicking on the table to edit it! You can also use alignment:

| Left | Center | Right |
|:-----|:------:|------:|
| L    |   C    |     R |
| 1    |   2    |     3 |

### Code Blocks 💻

Code blocks with syntax highlighting:

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return { message: 'Welcome!' };
}

greet('World');
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print([fibonacci(i) for i in range(10)])
\`\`\`

\`\`\`typescript
interface User {
  name: string;
  age: number;
}

const user: User = { name: 'Alice', age: 25 };
\`\`\`

Click on any code block to edit it!

### Images 🖼️

Images are rendered inline when you're not editing them:

![CodeMirror Logo](https://codemirror.net/style/logo.svg)

![Placeholder Image](https://picsum.photos/400/200 "A placeholder image")

Click on any image to see the Markdown syntax!

### Links 🔗

Links are rendered as clickable text:

- [CodeMirror Website](https://codemirror.net)
- [GitHub](https://github.com "Visit GitHub")
- Check out the [documentation](https://codemirror.net/docs/)

**Wiki-style links:** [[Internal Page]] and [[Another Page|Custom Text]]

Click on any link to edit it!

### How does it work?

When your cursor is **outside** formatted text, the markers are hidden and you see the rendered effect. When you move your cursor **inside**, the markers smoothly animate into view so you can edit them.

## More Examples

### Lists

- First item
- Second item with **bold**
- Third item with *italic*
  - Nested item
  - Another nested

### Quotes

> This is a quote.
> It can span multiple lines.
> 
> Try clicking inside to see the \`>\` markers!

### Headers

# H1 Header
## H2 Header
### H3 Header
#### H4 Header

Move your cursor to any header to see the \`#\` symbols appear!

## Technical Details

This is built with:
- **CodeMirror 6** - Modern code editor
- **Custom ViewPlugins** - For the Live Preview logic
- **CSS Animations** - Smooth transitions using \`max-width\` and \`fontSize\`
- **KaTeX** - Beautiful math rendering

The core mechanism is the \`shouldShowSource()\` function that checks if the cursor intersects with a formatted element.

---

**Tip:** Try switching to "Source Mode" using the button above to see all the Markdown markers at once!
`;

// Compartment for dynamic mode switching
const modeCompartment = new Compartment();

// Create editor state
const state = EditorState.create({
  doc: initialDoc,
  extensions: [
    // Basic extensions
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown({ base: markdownLanguage, extensions: [Table] }),
    EditorView.lineWrapping,

    // Live Preview extensions (in a compartment for dynamic switching)
    modeCompartment.of([
      collapseOnSelectionFacet.of(true),
      mouseSelectingField,
      livePreviewPlugin,
      markdownStylePlugin,
      mathPlugin,
      blockMathField,
      tableField,
      // codeBlockField(), // 暂时禁用，存在源码模式点击位置偏移问题
      imageField(),
      linkPlugin({
        openInNewTab: true,
        onWikiLinkClick: (link) => {
          alert(`Wiki link clicked: ${link}`);
        },
      }),
    ]),

    // Theme
    editorTheme,
  ],
});

// Create editor view
const view = new EditorView({
  state,
  parent: document.getElementById('editor')!,
});

// Setup drag selection detection
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});

document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});

// Mode switching buttons
const liveBtn = document.getElementById('liveBtn')!;
const sourceBtn = document.getElementById('sourceBtn')!;

liveBtn.addEventListener('click', () => {
  view.dispatch({
    effects: modeCompartment.reconfigure([
      collapseOnSelectionFacet.of(true),
      mouseSelectingField,
      livePreviewPlugin,
      markdownStylePlugin,
      mathPlugin,
      blockMathField,
      tableField,
      // codeBlockField(), // 暂时禁用，存在点击位置偏移问题
      imageField(),
      linkPlugin({
        openInNewTab: true,
        onWikiLinkClick: (link) => {
          alert(`Wiki link clicked: ${link}`);
        },
      }),
    ]),
  });
  liveBtn.classList.add('active');
  sourceBtn.classList.remove('active');
});

sourceBtn.addEventListener('click', () => {
  view.dispatch({
    effects: modeCompartment.reconfigure([
      collapseOnSelectionFacet.of(false),
      markdownStylePlugin,
    ]),
  });
  sourceBtn.classList.add('active');
  liveBtn.classList.remove('active');
});
