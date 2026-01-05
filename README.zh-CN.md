# codemirror-live-markdown

> CodeMirror 6 的实时预览模式 - 灵感来自 Obsidian

[![npm version](https://img.shields.io/npm/v/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![npm downloads](https://img.shields.io/npm/dm/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | 简体中文

**⚠️ 开发中** - 这是一个早期项目，核心功能已实现，更多功能正在开发中。

**[🚀 在线演示](https://codemirror-live-markdown.vercel.app/)** - 立即体验！

## 特性

- ✨ **实时预览** - 非编辑状态下隐藏 Markdown 标记符号
- 🎯 **智能显示** - 光标进入时平滑展开标记，可直接编辑
- 🎨 **流畅动画** - CSS 过渡动画，体验丝滑
- 📝 **多种元素** - 支持加粗、斜体、标题、列表、引用等
- 🧮 **数学公式** - KaTeX 渲染行内和块级数学公式（v0.2.0+）
- 📊 **表格** - Markdown 表格实时预览（v0.3.0+）
- 💻 **代码块** - lowlight 语法高亮（v0.4.0+）
- ⚡ **性能优化** - 位置缓存、拖拽选择优化
- 🔧 **TypeScript** - 完整的类型定义

## 在线演示

**在线体验：** https://codemirror-live-markdown.vercel.app/

**本地运行：**
```bash
cd demo
npm install
npm run dev
```

访问 http://localhost:5173

## 安装

```bash
npm install codemirror-live-markdown@alpha
```

**需要同时安装 peer dependencies：**
```bash
npm install @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/language @lezer/markdown
```

**可选：数学公式支持（v0.2.0+）：**
```bash
npm install katex
```

**可选：代码块语法高亮（v0.4.0+）：**
```bash
npm install lowlight
```

## 快速开始

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
  doc: '# 你好\n\n这是 **粗体** 和 *斜体* 文本。',
  extensions: [
    markdown({ extensions: [Table] }),
    collapseOnSelectionFacet.of(true),
    mouseSelectingField,
    livePreviewPlugin,
    markdownStylePlugin,
    mathPlugin,       // 可选：行内数学公式支持
    blockMathField,   // 可选：块级数学公式支持
    tableField,       // 可选：表格支持
    codeBlockField(), // 可选：代码块语法高亮
    editorTheme,
  ],
});

const view = new EditorView({
  state,
  parent: document.getElementById('editor')!,
});

// 必需：设置拖拽选择检测
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});

document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});
```

## 工作原理

核心是 `shouldShowSource(state, from, to)` 函数，它根据光标位置决定是否显示标记：

```
文档内容: "Hello **world** test"
位置:      0     6    13   18

场景 1: 光标在位置 5（"Hello" 后面）
→ shouldShowSource(state, 6, 15) = false
→ 隐藏 **, 显示粗体效果

场景 2: 光标在位置 10（"world" 中间）
→ shouldShowSource(state, 6, 15) = true
→ 显示 **, 可以编辑
```

**动画技术：**
- **行内标记**（加粗、斜体）：使用 `max-width: 0` → `max-width: 4ch` 过渡
- **块级标记**（标题、列表）：使用 `fontSize: 0.01em` → `fontSize: 1em` 过渡

## API

### 扩展

- `livePreviewPlugin` - 主实时预览插件
- `markdownStylePlugin` - Markdown 样式（标题、粗体、斜体等）
- `mathPlugin` - 行内数学公式渲染（需要 KaTeX）
- `blockMathField` - 块级数学公式渲染（需要 KaTeX）
- `tableField` - 表格渲染（需要 `@lezer/markdown` Table 扩展）
- `codeBlockField(options?)` - 代码块语法高亮（需要 lowlight）
- `editorTheme` - 带动画的默认主题

### 状态管理

- `collapseOnSelectionFacet` - 启用/禁用实时预览
- `mouseSelectingField` - 跟踪拖拽选择状态
- `setMouseSelecting` - 设置拖拽状态的 Effect

### 工具函数

- `shouldShowSource(state, from, to)` - 核心判断函数
- `renderMath(source, displayMode)` - 使用 KaTeX 渲染数学公式
- `clearMathCache()` - 清空数学公式渲染缓存
- `highlightCode(code, lang?)` - 使用 lowlight 高亮代码
- `registerLanguage(name, syntax)` - 注册额外的高亮语言
- `isLanguageRegistered(name)` - 检查语言是否已注册
- `initHighlighter()` - 初始化语法高亮器（异步，使用高亮前调用）
- `isHighlighterAvailable()` - 检查高亮器是否可用

## 数学公式（v0.2.0+）

**行内公式：** 使用反引号-美元符号语法
```markdown
著名的方程 `$E = mc^2$` 表示质能等价。
```

**块级公式：** 使用 `math` 语言的代码块
````markdown
```math
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
```
````

**使用要求：**
1. 安装 KaTeX：`npm install katex`
2. 在 HTML 中引入 KaTeX CSS：
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
```
3. 在扩展中添加 `mathPlugin`

**功能特性：**
- 点击渲染结果进入编辑模式
- 渲染和编辑模式之间平滑过渡
- 无效 LaTeX 的错误处理
- 渲染缓存提升性能

## 表格（v0.3.0+）

光标在表格外时，表格会渲染为 HTML：

```markdown
| 姓名  | 年龄 | 城市     |
|-------|------|----------|
| Alice | 25   | 北京     |
| Bob   | 30   | 上海     |
```

**对齐支持：**
```markdown
| 左对齐 | 居中 | 右对齐 |
|:-------|:----:|-------:|
| L      |  C   |      R |
```

**使用要求：**
1. 启用 GFM Table 扩展：
```typescript
import { markdown } from '@codemirror/lang-markdown';
import { Table } from '@lezer/markdown';

markdown({ extensions: [Table] })
```
2. 在扩展中添加 `tableField`

**功能特性：**
- 点击渲染的表格进入编辑模式
- 渲染和编辑模式之间平滑过渡
- 支持左对齐、居中、右对齐
- 编辑模式下源码高亮显示

## 代码块（v0.4.0+）

光标在代码块外时，代码块会渲染为语法高亮：

````markdown
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
```
````

**使用要求：**
1. 安装 lowlight：`npm install lowlight`
2. 在扩展中添加 `codeBlockField()`

**配置选项：**
```typescript
codeBlockField({
  lineNumbers: false,      // 显示行号（默认：false）
  copyButton: true,        // 显示复制按钮（默认：true）
  defaultLanguage: 'text', // 未指定语言时的默认语言
})
```

**注册额外语言：**
```typescript
import { registerLanguage } from 'codemirror-live-markdown';
import rust from 'highlight.js/lib/languages/rust';

registerLanguage('rust', rust);
```

**功能特性：**
- 点击渲染的代码块进入编辑模式
- 支持 30+ 种常用语言的语法高亮
- 复制按钮带成功反馈
- 可选行号显示
- lowlight 未安装时优雅降级

**支持的语言（内置）：**
JavaScript、TypeScript、Python、Java、C、C++、C#、Go、Rust、Ruby、PHP、Swift、Kotlin、SQL、HTML、CSS、JSON、YAML、Markdown、Bash 等。

## 自定义样式

使用 CSS 变量自定义颜色：

```css
:root {
  --foreground: 0 0% 0%;
  --primary: 221 83% 53%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  
  /* Markdown 专用 */
  --md-heading: var(--foreground);
  --md-bold: var(--foreground);
  --md-italic: var(--foreground);
  --md-link: var(--primary);
}
```

## 路线图

查看 [ROADMAP.md](./ROADMAP.md) 了解详细的版本计划。

**即将推出：**
- [x] v0.2.0-alpha: 数学公式（KaTeX）✅
- [x] v0.3.0-alpha: 表格 ✅
- [x] v0.4.0-alpha: 代码块语法高亮 ✅
- [ ] v0.5.0-alpha: 图片和链接
- [ ] v1.0.0: 稳定版本

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 监听模式
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint
```

## 贡献

欢迎贡献！请查看 [GitHub Issues](https://github.com/blueberrycongee/codemirror-live-markdown/issues)。

## 许可证

MIT © [blueberrycongee](https://github.com/blueberrycongee)

## 致谢

灵感来自 [Obsidian](https://obsidian.md/) 的实时预览模式。
