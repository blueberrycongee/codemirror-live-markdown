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

## 快速开始

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
  doc: '# 你好\n\n这是 **粗体** 和 *斜体* 文本。',
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
- `editorTheme` - 带动画的默认主题

### 状态管理

- `collapseOnSelectionFacet` - 启用/禁用实时预览
- `mouseSelectingField` - 跟踪拖拽选择状态
- `setMouseSelecting` - 设置拖拽状态的 Effect

### 工具函数

- `shouldShowSource(state, from, to)` - 核心判断函数

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
- [ ] v0.2.0-alpha: 数学公式（KaTeX）
- [ ] v0.3.0-alpha: 表格
- [ ] v0.4.0-alpha: 代码块语法高亮
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
