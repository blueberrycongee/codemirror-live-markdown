# codemirror-live-markdown

[![npm version](https://img.shields.io/npm/v/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![npm downloads](https://img.shields.io/npm/dm/codemirror-live-markdown.svg)](https://www.npmjs.com/package/codemirror-live-markdown)
[![CI](https://github.com/blueberrycongee/codemirror-live-markdown/actions/workflows/ci.yml/badge.svg)](https://github.com/blueberrycongee/codemirror-live-markdown/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**CodeMirror 6 的 Obsidian 风格实时预览** — 模块化插件集合，在非编辑状态下隐藏 Markdown 语法。

[English](./README.md) | 简体中文

[在线演示](https://codemirror-live-markdown.vercel.app/) · [文档](#文档) · [路线图](./ROADMAP.md)

---

## 为什么选择这个库？

大多数 Markdown 编辑器让你二选一：要么看原始语法，要么看渲染结果。实时预览两者兼得 — 语法只在光标进入时显示，让你在看到格式化结果的同时自然地编辑。

**核心优势：**
- **模块化** — 按需导入（数学公式？表格？代码块？）
- **零锁定** — 兼容任何 CodeMirror 6 配置
- **轻量级** — 不强制依赖重型库

## 功能特性

| 功能 | 描述 | 版本 |
|------|------|------|
| ✨ 实时预览 | 非编辑时隐藏标记 | v0.1.0 |
| 📝 行内格式 | 粗体、斜体、删除线、行内代码 | v0.1.0 |
| 📑 块级元素 | 标题、列表、引用 | v0.1.0 |
| 🧮 数学公式 | KaTeX 渲染（行内和块级） | v0.2.0 |
| 📊 表格 | GFM 表格渲染 | v0.3.0 |
| 💻 代码块 | lowlight 语法高亮 | v0.4.0 |
| 🖼️ 图片 | 图片预览与加载状态 | v0.5.0 |
| 🔗 链接 | 可点击的链接渲染 | v0.5.0 |
| 🧩 可编辑表格（高级） | 可选表格编辑器：单元格直改 + 源码切换 | v0.5.1 |

## 安装

```bash
npm install codemirror-live-markdown
```

**必需的 peer dependencies：**
```bash
npm install @codemirror/state @codemirror/view @codemirror/lang-markdown @codemirror/language @lezer/markdown
```

**可选依赖**（按需安装）：
```bash
npm install katex      # 数学公式
npm install lowlight   # 代码语法高亮
```

## 快速开始

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
    doc: '# 你好世界\n\n这是 **粗体** 和 *斜体* 文本。',
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

// 必需：跟踪鼠标选择状态
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});
document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});
```

## 文档

### 添加可选功能

每个功能都是独立插件，按需导入：

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
  markdown({ extensions: [Table] }), // 在解析器中启用 GFM 表格
  // ... 快速开始中的核心扩展
  
  // 可选功能：
  mathPlugin,                        // 行内数学：`$E=mc^2$`
  blockMathField,                    // 块级数学：```math
  tableField,                        // GFM 表格
  tableEditorPlugin(),               // 可编辑表格（带源码切换）
  codeBlockField({ copyButton: true }), // 带语法高亮的代码块
  imageField(),                      // 图片预览
  linkPlugin(),                      // 链接渲染
];
```

### 代码块配置

```typescript
codeBlockField({
  lineNumbers: false,      // 显示行号
  copyButton: true,        // 显示复制按钮
  defaultLanguage: 'text', // 默认语言
  interaction: 'auto',     // 'auto' | 'toggle'
})
```

- `interaction: 'auto'`（默认）：光标进入代码块时自动切回源码模式。  
- `interaction: 'toggle'`：默认保持渲染态，通过 `MD` / `Code` 按钮切换。

### 注册额外语言

```typescript
import { registerLanguage, initHighlighter } from 'codemirror-live-markdown';
import rust from 'highlight.js/lib/languages/rust';

// 初始化高亮器（首次使用前必需）
await initHighlighter();

// 注册额外语言
registerLanguage('rust', rust);
```

### 主题定制

使用 CSS 变量自定义：

```css
:root {
  --md-heading: #1a1a1a;
  --md-bold: #1a1a1a;
  --md-italic: #1a1a1a;
  --md-link: #2563eb;
  --md-code-bg: #f5f5f5;
}
```

## API 参考

### 核心扩展

| 导出 | 描述 |
|------|------|
| `livePreviewPlugin` | 主实时预览行为 |
| `markdownStylePlugin` | 标题、粗体、斜体等样式 |
| `editorTheme` | 带动画的默认主题 |
| `mouseSelectingField` | 跟踪拖拽选择状态 |
| `collapseOnSelectionFacet` | 启用/禁用实时预览 |

### 功能扩展

| 导出 | 描述 | 依赖 |
|------|------|------|
| `mathPlugin` | 行内数学渲染 | `katex` |
| `blockMathField` | 块级数学渲染 | `katex` |
| `tableField` | 表格渲染 | `@lezer/markdown` Table |
| `tableEditorPlugin()` | 可编辑表格渲染 | `@lezer/markdown` Table |
| `codeBlockField(options?)` | 代码块高亮 | `lowlight` |
| `setCodeBlockSourceMode` | 通过 effect 切换代码块源码模式 | — |
| `imageField(options?)` | 图片预览 | — |
| `linkPlugin(options?)` | 链接渲染 | — |

### 工具函数

| 导出 | 描述 |
|------|------|
| `shouldShowSource(state, from, to)` | 检查范围是否应显示源码 |
| `renderMath(source, displayMode)` | 渲染 LaTeX 为 HTML |
| `highlightCode(code, lang?)` | 高亮代码字符串 |
| `initHighlighter()` | 初始化语法高亮器 |
| `isHighlighterAvailable()` | 检查高亮器是否就绪 |

## 开发

```bash
git clone https://github.com/blueberrycongee/codemirror-live-markdown.git
cd codemirror-live-markdown
npm install
npm run dev      # 监听模式
npm test         # 运行测试
npm run build    # 生产构建
```

**运行演示：**
```bash
cd demo
npm install
npm run dev
```

## 贡献

欢迎贡献！提交 PR 前请阅读贡献指南。

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 许可证

[MIT](./LICENSE) © [blueberrycongee](https://github.com/blueberrycongee)

## 致谢

- 灵感来自 [Obsidian](https://obsidian.md/) 的实时预览模式
- 基于 [CodeMirror 6](https://codemirror.net/) 构建
- 语法高亮由 [lowlight](https://github.com/wooorm/lowlight) 提供
- 数学渲染由 [KaTeX](https://katex.org/) 提供
