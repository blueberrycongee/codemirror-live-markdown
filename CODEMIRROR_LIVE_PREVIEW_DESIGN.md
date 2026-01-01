# CodeMirror 6 Live Preview 实现文档

> **AI Prompt**: 请基于本文档构建一个高质量的开源 npm 包 `codemirror-obsidian-mode`。
> 
> **要求**：
> - 遵循社区最佳实践：TypeScript 严格模式、ESM + CJS 双格式输出、完整的类型定义
> - 代码质量：ESLint + Prettier、单元测试覆盖率 > 80%、E2E 测试
> - 文档完善：README（中英双语）、API 文档（TypeDoc）、CHANGELOG、CONTRIBUTING
> - 工程化：GitHub Actions CI/CD、语义化版本、自动发布到 npm
> - 包结构：Tree-shakable、支持按需引入、最小化 bundle size
> - 开发体验：Playground Demo 站点、Storybook 组件文档
> - 参考标杆：@codemirror/* 官方包、tiptap、milkdown 的工程结构
> 
> **核心功能**：实现类 Obsidian 的 Markdown Live Preview 模式——非活动行隐藏标记符号并渲染效果，光标进入时平滑展开显示原始标记，支持编辑。

---

基于 CodeMirror 6 实现类 Obsidian 的 Markdown 实时预览编辑器。

## 目录

1. [核心特性](#核心特性)
2. [为什么选择 CodeMirror 6](#为什么选择-codemirror-6)
3. [架构概览](#1-架构概览)
4. [核心机制：shouldShowSource](#2-核心机制shouldshowsource)
5. [行内标记动画](#3-行内标记动画bolditalistrikethrough)
6. [块级标记](#4-块级标记headingslistsquotes)
7. [复杂元素：Widget 替换](#5-复杂元素widget-替换)
8. [性能优化](#6-性能优化)
9. [Widget 点击交互](#7-widget-点击交互)
10. [完整的 StateField 模式](#8-完整的-statefield-模式)
11. [样式主题](#9-样式主题)
12. [依赖项](#10-依赖项)
13. [使用示例](#11-使用示例)
14. [已知限制](#12-已知限制)
15. [与其他方案对比](#13-与其他方案对比)
16. [后续优化方向](#14-后续优化方向)

---

## 核心特性

- **Live Preview 模式**：非活动行隐藏 Markdown 标记，光标进入时显示
- **平滑动画**：标记符号的显示/隐藏带有 CSS 过渡动画
- **多种元素支持**：标题、加粗、斜体、删除线、代码、高亮、数学公式、表格、代码块、图片
- **性能优化**：位置缓存、KaTeX 预渲染、拖拽选择优化

---

## 为什么选择 CodeMirror 6

### Live Preview 的核心需求

Obsidian 风格的 Live Preview 有一个关键特点：

> **底层存储的是 Markdown 纯文本，但显示时渲染成富文本样式，光标进入时显示原始标记**

这意味着：
- 文件内容必须是 `**bold**` 这样的纯文本
- 非活动时隐藏 `**`，只显示粗体效果
- 光标进入时显示 `**`，可以直接编辑

### 为什么不用 ProseMirror / Tiptap

ProseMirror（Tiptap 的底层）使用**结构化文档模型**：

```javascript
// ProseMirror 内部表示
{
  type: "paragraph",
  content: [
    { type: "text", text: "This is " },
    { type: "text", marks: [{ type: "bold" }], text: "bold" },
    { type: "text", text: " text" }
  ]
}
```

它**根本不存储** `**bold**` 这样的 Markdown 标记，而是存储语义结构。要实现 Live Preview：
- 需要在两种表示之间来回转换
- 光标进入时要把结构化节点转回 Markdown 文本
- 非常别扭，违背了 ProseMirror 的设计理念

### CodeMirror 6 的优势

CodeMirror 6 是**纯文本编辑器**：
- 底层就是纯文本，天然保留 Markdown 源码
- 使用 Decoration API 控制显示效果
- 可以精确控制哪些字符显示、哪些隐藏
- 语法树（lezer-markdown）提供标记位置信息

这正是 Obsidian 选择 CodeMirror 6 的原因。

---

## 1. 架构概览

### 1.1 三种视图模式

```typescript
type ViewMode = 'reading' | 'live' | 'source';
```

| 模式 | 描述 | 标记显示 | 可编辑 |
|------|------|----------|--------|
| `reading` | 只读模式，纯渲染展示 | 全部隐藏 | ❌ |
| `live` | 实时预览，光标所在行显示标记 | 活动行显示 | ✅ |
| `source` | 源码模式，显示所有标记 | 全部显示 | ✅ |

### 1.2 CodeMirror 6 核心概念

在深入实现之前，需要理解 CodeMirror 6 的几个核心概念：

#### EditorState 与 EditorView

```typescript
// EditorState: 不可变的编辑器状态（文档内容、选区、扩展配置等）
const state = EditorState.create({
  doc: "Hello World",
  extensions: [/* ... */]
});

// EditorView: 可变的视图层，负责 DOM 渲染和用户交互
const view = new EditorView({
  state,
  parent: document.getElementById("editor")
});

// 状态更新通过 dispatch 触发
view.dispatch({
  changes: { from: 0, to: 5, insert: "Hi" },
  selection: { anchor: 2 }
});
```

#### Decoration（装饰）

Decoration 是 CodeMirror 6 中控制文本显示的核心机制：

```typescript
// Mark Decoration: 给文本范围添加样式
Decoration.mark({ class: "cm-bold" }).range(0, 10)

// Widget Decoration: 在某个位置插入自定义 DOM
Decoration.widget({ widget: new MyWidget() }).range(5)

// Replace Decoration: 用 Widget 替换文本范围
Decoration.replace({ widget: new MyWidget() }).range(0, 10)

// Line Decoration: 给整行添加样式
Decoration.line({ class: "cm-active-line" }).range(lineStart)
```

#### StateField（状态字段）

StateField 用于管理自定义状态，并在状态变化时更新：

```typescript
const myField = StateField.define<DecorationSet>({
  // 初始化
  create(state) {
    return buildDecorations(state);
  },
  
  // 状态更新时调用
  update(value, tr) {
    if (tr.docChanged) {
      return buildDecorations(tr.state);
    }
    return value.map(tr.changes);
  },
  
  // 将装饰提供给视图
  provide: f => EditorView.decorations.from(f)
});
```

#### ViewPlugin（视图插件）

ViewPlugin 用于需要访问视图信息（如视口范围）的场景：

```typescript
const myPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  
  constructor(view: EditorView) {
    this.decorations = this.build(view);
  }
  
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.build(update.view);
    }
  }
  
  build(view: EditorView) {
    // 可以访问 view.viewport 等信息
    return Decoration.set([/* ... */]);
  }
}, {
  decorations: v => v.decorations
});
```

#### Facet（配置面）

Facet 用于定义可配置的值：

```typescript
// 定义 Facet
const collapseOnSelectionFacet = Facet.define<boolean, boolean>({
  combine: values => values[0] ?? false
});

// 使用 Facet
const extensions = [
  collapseOnSelectionFacet.of(true)  // 启用 Live Preview
];

// 读取 Facet 值
const shouldCollapse = state.facet(collapseOnSelectionFacet);
```

#### Compartment（配置隔间）

Compartment 用于动态重新配置扩展：

```typescript
const viewModeCompartment = new Compartment();

// 初始配置
const state = EditorState.create({
  extensions: [
    viewModeCompartment.of(livePreviewExtensions)
  ]
});

// 动态切换
view.dispatch({
  effects: viewModeCompartment.reconfigure(sourceExtensions)
});
```

### 1.3 核心组件架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CodeMirrorEditor                             │
├─────────────────────────────────────────────────────────────────────┤
│  Compartments (动态配置)                                              │
│  ├── viewModeCompartment    → 视图模式扩展 (live/reading/source)     │
│  ├── readOnlyCompartment    → 只读状态                               │
│  └── themeCompartment       → 主题配置                               │
├─────────────────────────────────────────────────────────────────────┤
│  Facets (全局配置)                                                    │
│  └── collapseOnSelectionFacet → 是否启用 Live Preview                │
├─────────────────────────────────────────────────────────────────────┤
│  StateFields (状态管理 + 装饰)                                        │
│  ├── mouseSelectingField    → 拖拽选择状态 (boolean)                 │
│  ├── mathStateField         → 数学公式装饰 (DecorationSet)           │
│  ├── tableStateField        → 表格装饰 (DecorationSet)               │
│  ├── codeBlockStateField    → 代码块装饰 (DecorationSet)             │
│  ├── highlightStateField    → 高亮装饰 (DecorationSet)               │
│  ├── wikiLinkStateField     → Wiki 链接装饰 (DecorationSet)          │
│  ├── calloutStateField      → Callout 装饰 (DecorationSet)           │
│  ├── imageInfoField         → 图片信息状态 (Set<string>)             │
│  └── voicePreviewField      → 语音预览装饰 (DecorationSet)           │
├─────────────────────────────────────────────────────────────────────┤
│  ViewPlugins (视图插件)                                               │
│  ├── livePreviewPlugin      → Live 模式：行内标记动画                 │
│  ├── readingModePlugin      → Reading 模式：标记完全隐藏              │
│  └── markdownStylePlugin    → Markdown 样式应用 (标题大小等)          │
├─────────────────────────────────────────────────────────────────────┤
│  Widgets (自定义 DOM 渲染)                                            │
│  ├── MathWidget             → KaTeX 公式渲染                         │
│  ├── TableWidget            → 表格 HTML 渲染                         │
│  ├── CodeBlockWidget        → 代码块语法高亮 (lowlight)              │
│  ├── MermaidWidget          → Mermaid 图表渲染                       │
│  ├── ImageWidget            → 图片渲染 (支持本地/网络)                │
│  ├── CalloutIconWidget      → Callout 图标                           │
│  └── VoicePreviewWidget     → 语音输入预览                           │
├─────────────────────────────────────────────────────────────────────┤
│  Event Handlers (事件处理)                                            │
│  ├── handleMouseDown        → 拖拽选择开始                           │
│  ├── handleMouseUp          → 拖拽选择结束                           │
│  ├── handleClick            → Widget 点击 → 聚焦源码                 │
│  └── handlePaste            → 图片粘贴处理                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 数据流

```
用户操作 (输入/选择/点击)
         │
         ▼
┌─────────────────┐
│   EditorView    │ ← DOM 事件
└────────┬────────┘
         │ dispatch({ changes, selection, effects })
         ▼
┌─────────────────┐
│  Transaction    │ ← 包含变更信息
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EditorState    │ ← 新状态
└────────┬────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────┐                   ┌─────────────────┐
│  StateField     │                   │   ViewPlugin    │
│  .update()      │                   │   .update()     │
└────────┬────────┘                   └────────┬────────┘
         │                                      │
         │ 重建 DecorationSet                   │ 重建 DecorationSet
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  DOM 更新       │ ← 应用装饰，渲染 Widget
              └─────────────────┘
```

---

## 2. 核心机制：shouldShowSource

这是整个 Live Preview 的**核心判断函数**，决定某个元素应该显示源码还是渲染效果。

### 2.1 完整实现

```typescript
import { EditorState, Facet, StateField, StateEffect } from "@codemirror/state";

// Facet: 控制是否启用 Live Preview
const collapseOnSelectionFacet = Facet.define<boolean, boolean>({
  combine: values => values[0] ?? false
});

// Effect: 设置拖拽选择状态
const setMouseSelecting = StateEffect.define<boolean>();

// StateField: 跟踪拖拽选择状态
const mouseSelectingField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setMouseSelecting)) return effect.value;
    }
    return value;
  },
});

/**
 * 判断指定范围是否应该显示源码
 * @param state - 编辑器状态
 * @param from - 元素起始位置
 * @param to - 元素结束位置
 * @returns true = 显示源码, false = 显示渲染效果
 */
const shouldShowSource = (state: EditorState, from: number, to: number): boolean => {
  // 1. 检查是否启用 Live Preview
  const shouldCollapse = state.facet(collapseOnSelectionFacet);
  if (!shouldCollapse) return false;  // 未启用，始终显示源码
  
  // 2. 拖拽选择时不显示源码（避免闪烁）
  if (state.field(mouseSelectingField, false)) return false;
  
  // 3. 检查光标是否接触目标区域
  for (const range of state.selection.ranges) {
    // 只要有交集就显示源码
    if (range.from <= to && range.to >= from) return true;
  }
  
  return false;  // 无交集，显示渲染效果
};
```

### 2.2 工作原理图解

```
文档内容: "Hello **world** test"
位置:      0     6    13   18

场景 1: 光标在 "Hello" 后面 (位置 5)
┌─────────────────────────────────────┐
│ Hello |**world** test               │  ← 光标位置 5
│       ↑                             │
│   range.from=5, range.to=5          │
│   **world** 范围: from=6, to=15     │
│   5 <= 15 && 5 >= 6 → false         │
│   结果: 隐藏 **, 显示粗体效果        │
└─────────────────────────────────────┘

场景 2: 光标在 "world" 中间 (位置 10)
┌─────────────────────────────────────┐
│ Hello **wor|ld** test               │  ← 光标位置 10
│            ↑                        │
│   range.from=10, range.to=10        │
│   **world** 范围: from=6, to=15     │
│   10 <= 15 && 10 >= 6 → true        │
│   结果: 显示 **, 可以编辑           │
└─────────────────────────────────────┘

场景 3: 选区跨越 (位置 4-12)
┌─────────────────────────────────────┐
│ Hell[o **wor]ld** test              │  ← 选区 4-12
│     ↑       ↑                       │
│   range.from=4, range.to=12         │
│   **world** 范围: from=6, to=15     │
│   4 <= 15 && 12 >= 6 → true         │
│   结果: 显示 **, 可以编辑           │
└─────────────────────────────────────┘
```

### 2.3 为什么需要拖拽检测

在用户拖拽选择文本时，如果每次鼠标移动都重建装饰，会导致：
1. **性能问题**：频繁重建 DecorationSet
2. **视觉闪烁**：Widget 不断出现/消失
3. **选择中断**：DOM 变化可能打断选择操作

解决方案：

```typescript
// 在 mousedown 时设为 true
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});

// 在 mouseup 时设为 false（延迟一帧确保选择完成）
document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});
```

在 StateField 的 update 中检查：

```typescript
update(deco, tr) {
  const isDragging = tr.state.field(mouseSelectingField, false);
  const wasDragging = tr.startState.field(mouseSelectingField, false);
  
  // 正在拖拽：跳过重建
  if (isDragging) return deco;
  
  // 刚结束拖拽：重建一次
  if (wasDragging && !isDragging) {
    return buildDecorations(tr.state);
  }
  
  // 其他情况正常处理...
}
```

---

## 3. 行内标记动画（Bold/Italic/Strikethrough）

### 3.1 设计目标

实现类似 Obsidian 的效果：
- 非活动时：`**` 隐藏，文字显示粗体
- 活动时：`**` 平滑展开显示，可以编辑
- 过渡动画：展开/收起有 CSS 动画

### 3.2 CSS 动画原理

关键是使用 `max-width` 而非 `display: none`：

```typescript
const editorTheme = EditorView.theme({
  // 默认状态：收起（隐藏）
  ".cm-formatting-inline": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    verticalAlign: "baseline",
    color: "hsl(var(--muted-foreground) / 0.6)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.85em",
    
    // 关键动画属性
    maxWidth: "0",           // 宽度为 0
    opacity: "0",            // 完全透明
    transform: "scaleX(0.8)", // 略微缩小
    
    // 过渡动画
    transition: `
      max-width 0.2s cubic-bezier(0.2, 0, 0.2, 1),
      opacity 0.15s ease-out,
      transform 0.15s ease-out
    `,
    
    pointerEvents: "none",  // 隐藏时不响应点击
  },
  
  // 激活状态：展开（显示）
  ".cm-formatting-inline-visible": {
    maxWidth: "4ch",         // 足够容纳 ** 或 ~~
    opacity: "1",            // 完全不透明
    transform: "scaleX(1)",  // 正常大小
    margin: "0 1px",         // 添加间距
    pointerEvents: "auto",   // 可以点击
  },
});
```

### 3.3 为什么用 max-width 而非 display

| 方案 | 优点 | 缺点 |
|------|------|------|
| `display: none` | 简单 | 无法做动画，切换时跳动 |
| `visibility: hidden` | 保留空间 | 隐藏时仍占空间 |
| `width: 0` | 可动画 | 需要知道精确宽度 |
| `max-width: 0` | 可动画，自适应 | ✅ 最佳方案 |

### 3.4 ViewPlugin 实现

```typescript
const livePreviewPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  
  constructor(view: EditorView) {
    this.decorations = this.build(view);
  }
  
  update(update: ViewUpdate) {
    // 文档变化或视口变化：必须重建
    if (update.docChanged || update.viewportChanged || 
        update.transactions.some(t => t.reconfigured)) {
      this.decorations = this.build(update.view);
      return;
    }
    
    // 拖动状态变化
    const isDragging = update.state.field(mouseSelectingField, false);
    const wasDragging = update.startState.field(mouseSelectingField, false);
    
    // 刚结束拖动：重建
    if (wasDragging && !isDragging) {
      this.decorations = this.build(update.view);
      return;
    }
    
    // 正在拖动：跳过
    if (isDragging) return;
    
    // 普通选择变化：重建
    if (update.selectionSet) {
      this.decorations = this.build(update.view);
    }
  }
  
  build(view: EditorView) {
    const decorations: Range<Decoration>[] = [];
    const { state } = view;
    
    // 获取所有活动行
    const activeLines = new Set<number>();
    for (const range of state.selection.ranges) {
      const startLine = state.doc.lineAt(range.from).number;
      const endLine = state.doc.lineAt(range.to).number;
      for (let l = startLine; l <= endLine; l++) {
        activeLines.add(l);
      }
    }
    
    const isDrag = state.field(mouseSelectingField, false);

    // 遍历语法树
    syntaxTree(state).iterate({
      enter: (node) => {
        // 只处理标记节点
        const markTypes = [
          "EmphasisMark",      // * 或 _
          "StrikethroughMark", // ~~
          "CodeMark",          // `
          "HeaderMark",        // #
          "ListMark",          // - 或 *
          "QuoteMark"          // >
        ];
        
        if (!markTypes.includes(node.name)) return;
        
        const isBlock = ["HeaderMark", "ListMark", "QuoteMark"].includes(node.name);
        const lineNum = state.doc.lineAt(node.from).number;
        const isActiveLine = activeLines.has(lineNum);
        
        if (isBlock) {
          // 块级标记：使用 fontSize 动画
          const cls = (isActiveLine && !isDrag)
            ? "cm-formatting-block cm-formatting-block-visible"
            : "cm-formatting-block";
          decorations.push(
            Decoration.mark({ class: cls }).range(node.from, node.to)
          );
        } else {
          // 行内标记：使用 max-width 动画
          if (node.from >= node.to) return;
          
          const isTouched = shouldShowSource(state, node.from, node.to);
          const cls = (isTouched && !isDrag) 
            ? "cm-formatting-inline cm-formatting-inline-visible" 
            : "cm-formatting-inline";
          
          decorations.push(
            Decoration.mark({ class: cls }).range(node.from, node.to)
          );
        }
      }
    });
    
    return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
  }
}, {
  decorations: v => v.decorations
});
```

### 3.5 语法树节点说明

CodeMirror 的 Markdown 解析器（lezer-markdown）会生成这些节点：

| 节点名 | 对应语法 | 示例 |
|--------|----------|------|
| `EmphasisMark` | `*` 或 `_` | `*italic*` |
| `StrongEmphasis` | 整个粗体 | `**bold**` |
| `StrikethroughMark` | `~~` | `~~deleted~~` |
| `CodeMark` | `` ` `` | `` `code` `` |
| `HeaderMark` | `#` | `## Heading` |
| `ListMark` | `-` 或 `*` 或数字 | `- item` |
| `QuoteMark` | `>` | `> quote` |

注意：`EmphasisMark` 同时用于斜体和粗体的标记符号。

---

## 4. 块级标记（Headings/Lists/Quotes）

### 4.1 设计挑战

标题的 `#` 符号处理比行内标记更复杂：

1. **行高稳定性**：隐藏/显示 `#` 不能导致行高变化
2. **字体大小继承**：`#` 不应该继承标题的大字体
3. **对齐问题**：`#` 隐藏后，标题文字应该左对齐

### 4.2 CSS 实现

```typescript
const editorTheme = EditorView.theme({
  // 块级标记：默认隐藏
  ".cm-formatting-block": {
    display: "inline",
    overflow: "hidden",
    
    // 关键：使用极小字体而非 display:none
    // 这样 DOM 结构保持稳定，行高不变
    fontSize: "0.01em",
    lineHeight: "inherit",  // 继承行高，保持稳定
    
    opacity: "0",
    color: "hsl(var(--muted-foreground))",
    fontFamily: "'JetBrains Mono', monospace",
    
    transition: "font-size 0.2s ease-out, opacity 0.2s ease-out",
  },
  
  // 块级标记：激活状态
  ".cm-formatting-block-visible": {
    fontSize: "1em",  // 恢复正常大小（相对于父元素）
    opacity: "0.6",   // 半透明，不抢眼
  },
});
```

### 4.3 为什么用 fontSize: 0.01em

| 方案 | 行高稳定 | 可动画 | DOM 稳定 |
|------|----------|--------|----------|
| `display: none` | ❌ | ❌ | ❌ |
| `visibility: hidden` | ✅ | ❌ | ✅ |
| `width: 0; overflow: hidden` | ❌ | ✅ | ✅ |
| `fontSize: 0.01em` | ✅ | ✅ | ✅ |

`fontSize: 0.01em` 的优势：
- 字符仍然存在，只是极小
- 不影响行高计算
- 可以平滑过渡到正常大小
- DOM 结构完全不变

### 4.4 标题样式应用

除了标记动画，还需要给标题文字应用样式：

```typescript
const markdownStylePlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  
  constructor(view: EditorView) {
    this.decorations = this.build(view);
  }
  
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.build(update.view);
    }
  }
  
  build(view: EditorView) {
    const decorations: Range<Decoration>[] = [];
    
    syntaxTree(view.state).iterate({
      enter: (node) => {
        const styleMap: Record<string, string> = {
          "ATXHeading1": "cm-header-1",
          "ATXHeading2": "cm-header-2",
          "ATXHeading3": "cm-header-3",
          "ATXHeading4": "cm-header-4",
          "ATXHeading5": "cm-header-5",
          "ATXHeading6": "cm-header-6",
          "StrongEmphasis": "cm-strong",
          "Emphasis": "cm-emphasis",
          "Strikethrough": "cm-strikethrough",
          "InlineCode": "cm-code",
          "Link": "cm-link",
        };
        
        const cls = styleMap[node.name];
        if (cls) {
          decorations.push(
            Decoration.mark({ class: cls }).range(node.from, node.to)
          );
          
          // 标题还需要行级装饰
          if (node.name.startsWith("ATXHeading")) {
            decorations.push(
              Decoration.line({ class: "cm-heading-line" }).range(node.from)
            );
          }
        }
      }
    });
    
    return Decoration.set(decorations, true);
  }
}, {
  decorations: v => v.decorations
});
```

### 4.5 标题样式定义

```typescript
const editorTheme = EditorView.theme({
  ".cm-header-1": {
    fontSize: "2em",
    fontWeight: "700",
    lineHeight: "1.3",
    color: "hsl(var(--md-heading, var(--foreground)))",
  },
  ".cm-header-2": {
    fontSize: "1.5em",
    fontWeight: "600",
    lineHeight: "1.4",
    color: "hsl(var(--md-heading, var(--foreground)))",
  },
  ".cm-header-3": {
    fontSize: "1.25em",
    fontWeight: "600",
    lineHeight: "1.5",
    color: "hsl(var(--md-heading, var(--foreground)))",
  },
  ".cm-header-4, .cm-header-5, .cm-header-6": {
    fontWeight: "600",
    color: "hsl(var(--md-heading, var(--foreground)))",
  },
});
```

---

## 5. 复杂元素：Widget 替换

对于数学公式、表格、代码块等复杂元素，简单的 CSS 隐藏不够用，需要用 Widget 完全替换。

### 5.1 Widget 基类

```typescript
import { WidgetType } from "@codemirror/view";

class MathWidget extends WidgetType {
  constructor(
    readonly formula: string,
    readonly displayMode: boolean,      // true=块级 $$, false=行内 $
    readonly isPreviewPanel: boolean = false  // true=编辑时的预览面板
  ) {
    super();
  }
  
  // 判断两个 Widget 是否相等（用于优化，避免不必要的 DOM 更新）
  eq(other: MathWidget) {
    return other.formula === this.formula &&
           other.displayMode === this.displayMode &&
           other.isPreviewPanel === this.isPreviewPanel;
  }
  
  // 创建 DOM 元素
  toDOM() {
    const container = document.createElement(
      this.displayMode || this.isPreviewPanel ? "div" : "span"
    );
    
    container.className = this.isPreviewPanel
      ? "cm-math-preview-panel"
      : (this.displayMode ? "cm-math-block" : "cm-math-inline");
    
    // 添加标记，用于点击检测
    if (!this.isPreviewPanel) {
      container.dataset.widgetType = "math";
    }
    
    // 使用 KaTeX 渲染
    try {
      katex.render(this.formula, container, {
        displayMode: this.displayMode,
        throwOnError: false,
        strict: false
      });
    } catch (e) {
      container.textContent = this.formula;
    }
    
    return container;
  }
  
  // 是否忽略事件（让 CodeMirror 处理）
  ignoreEvent() {
    // 渲染态公式：忽略事件，由我们自己的 click handler 处理
    // 预览面板：让事件穿透
    return !this.isPreviewPanel;
  }
}
```

### 5.2 数学公式 StateField

```typescript
// 缓存公式位置，避免每次选择变化都重新解析
let mathPositionsCache: { from: number, to: number }[] = [];

const mathStateField = StateField.define<DecorationSet>({
  create: buildMathDecorations,
  
  update(deco, tr) {
    // 文档变化：必须重建
    if (tr.docChanged || tr.reconfigured) {
      return buildMathDecorations(tr.state);
    }
    
    // 拖拽选择处理
    const isDragging = tr.state.field(mouseSelectingField, false);
    const wasDragging = tr.startState.field(mouseSelectingField, false);
    
    if (wasDragging && !isDragging) {
      return buildMathDecorations(tr.state);
    }
    if (isDragging) {
      return deco;
    }
    
    // 选择变化：检查是否触及公式
    if (tr.selection) {
      const oldSel = tr.startState.selection.main;
      const newSel = tr.state.selection.main;
      
      const touchesMath = (sel: { from: number, to: number }) =>
        mathPositionsCache.some(m =>
          (sel.from >= m.from && sel.from <= m.to) ||
          (sel.to >= m.from && sel.to <= m.to) ||
          (sel.from <= m.from && sel.to >= m.to)
        );
      
      // 只有触及状态变化时才重建
      if (touchesMath(oldSel) !== touchesMath(newSel) ||
          (touchesMath(newSel) && (oldSel.from !== newSel.from || oldSel.to !== newSel.to))) {
        return buildMathDecorations(tr.state);
      }
    }
    
    return deco;
  },
  
  provide: f => EditorView.decorations.from(f),
});

function buildMathDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const doc = state.doc.toString();
  const processed: { from: number, to: number }[] = [];
  
  // 更新位置缓存
  mathPositionsCache = [];
  
  // 1. 块级公式 $$...$$
  const blockRegex = /\$\$([\s\S]+?)\$\$/g;
  let match;
  
  while ((match = blockRegex.exec(doc)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    processed.push({ from, to });
    mathPositionsCache.push({ from, to });
    
    const formula = match[1].trim();
    
    // 预渲染（后台进行）
    queuePrerender(formula, true);
    
    if (shouldShowSource(state, from, to)) {
      // 编辑模式：源码高亮 + 预览面板
      decorations.push(
        Decoration.mark({ class: "cm-math-source" }).range(from, to)
      );
      decorations.push(
        Decoration.widget({
          widget: new MathWidget(formula, true, true),  // isPreviewPanel=true
          side: 1,
          block: true
        }).range(to)
      );
    } else {
      // 预览模式：完全替换
      const fromLine = state.doc.lineAt(from);
      const toLine = state.doc.lineAt(to);
      const isFullLine = from === fromLine.from && to === toLine.to;
      
      decorations.push(
        Decoration.replace({
          widget: new MathWidget(formula, true),
          block: isFullLine
        }).range(from, to)
      );
    }
  }
  
  // 2. 行内公式 $...$
  const inlineRegex = /(?<!\\|\$)\$(?!\$)((?:[^$\n]|\n(?!\n))+?)(?<!\\|\$)\$(?!\$)/g;
  
  while ((match = inlineRegex.exec(doc)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    
    // 跳过已处理的块级公式
    if (processed.some(p => from >= p.from && to <= p.to)) continue;
    
    mathPositionsCache.push({ from, to });
    const formula = match[1].trim();
    
    queuePrerender(formula, false);
    
    if (shouldShowSource(state, from, to)) {
      decorations.push(
        Decoration.mark({ class: "cm-math-source" }).range(from, to)
      );
    } else {
      decorations.push(
        Decoration.replace({
          widget: new MathWidget(formula, false)
        }).range(from, to)
      );
    }
  }
  
  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}
```

### 5.3 表格 Widget

```typescript
class TableWidget extends WidgetType {
  constructor(readonly markdown: string) {
    super();
  }
  
  eq(other: TableWidget) {
    return other.markdown === this.markdown;
  }
  
  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-table-widget reading-view prose max-w-none";
    container.dataset.widgetType = "table";
    
    // 使用 markdown-it 或其他库渲染表格
    container.innerHTML = parseMarkdown(this.markdown);
    
    return container;
  }
  
  ignoreEvent() {
    return true;  // 让我们的 click handler 处理
  }
}

// 表格 StateField（结构与 mathStateField 类似）
let tablePositionsCache: { from: number, to: number }[] = [];

const tableStateField = StateField.define<DecorationSet>({
  create: buildTableDecorations,
  update(deco, tr) {
    // ... 与 mathStateField 类似的更新逻辑
  },
  provide: f => EditorView.decorations.from(f),
});

function buildTableDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  tablePositionsCache = [];
  
  // 使用语法树查找表格
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === "Table") {
        tablePositionsCache.push({ from: node.from, to: node.to });
        
        if (shouldShowSource(state, node.from, node.to)) {
          // 编辑模式：显示源码样式
          decorations.push(
            Decoration.mark({ class: "cm-table-source" }).range(node.from, node.to)
          );
        } else {
          // 预览模式：替换为渲染表格
          const markdown = state.doc.sliceString(node.from, node.to);
          decorations.push(
            Decoration.replace({
              widget: new TableWidget(markdown),
              block: true
            }).range(node.from, node.to)
          );
        }
      }
    }
  });
  
  return Decoration.set(decorations);
}
```

### 5.4 代码块 Widget

```typescript
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

class CodeBlockWidget extends WidgetType {
  constructor(
    readonly code: string,
    readonly language: string
  ) {
    super();
  }
  
  eq(other: CodeBlockWidget) {
    return other.code === this.code && other.language === this.language;
  }
  
  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-code-block-widget relative group rounded-md overflow-hidden border my-2";
    container.dataset.widgetType = "codeblock";
    
    container.innerHTML = `
      <pre class="p-3 m-0 bg-muted/50 overflow-auto text-sm">
        <code class="hljs font-mono ${this.language ? 'language-' + this.language : ''}"></code>
      </pre>
    `;
    
    const codeEl = container.querySelector("code")!;
    
    // 语法高亮
    if (this.language && lowlight.registered(this.language)) {
      try {
        const tree = lowlight.highlight(this.language, this.code);
        this.hastToDOM(tree.children, codeEl);
      } catch {
        codeEl.textContent = this.code;
      }
    } else {
      codeEl.textContent = this.code;
    }
    
    return container;
  }
  
  // 将 HAST (HTML AST) 转换为 DOM
  hastToDOM(nodes: any[], parent: HTMLElement) {
    for (const node of nodes) {
      if (node.type === 'text') {
        parent.appendChild(document.createTextNode(node.value));
      } else if (node.type === 'element') {
        const el = document.createElement(node.tagName);
        if (node.properties?.className) {
          el.className = node.properties.className.join(' ');
        }
        if (node.children) {
          this.hastToDOM(node.children, el);
        }
        parent.appendChild(el);
      }
    }
  }
  
  ignoreEvent() {
    return false;  // 允许点击进入编辑
  }
}
```

### 5.5 Mermaid 图表 Widget

```typescript
import mermaid from "mermaid";

// 初始化 mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

class MermaidWidget extends WidgetType {
  constructor(readonly code: string) {
    super();
  }
  
  eq(other: MermaidWidget) {
    return other.code === this.code;
  }
  
  toDOM() {
    const container = document.createElement("div");
    container.className = "mermaid-container my-2";
    
    const pre = document.createElement("pre");
    pre.className = "mermaid";
    pre.textContent = this.code;
    container.appendChild(pre);
    
    // 异步渲染 mermaid
    setTimeout(async () => {
      try {
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        await mermaid.run({ nodes: [pre] });
      } catch (err) {
        console.error('[Mermaid] Render failed:', err);
        pre.textContent = `Mermaid Error: ${this.code}`;
        pre.style.color = 'red';
      }
    }, 0);
    
    return container;
  }
  
  ignoreEvent() {
    return true;
  }
}
```

---

## 6. 性能优化

### 6.1 位置缓存策略

每次选择变化都重新解析文档是很昂贵的。使用位置缓存可以大幅减少不必要的重建：

```typescript
// 缓存所有公式的位置
let mathPositionsCache: { from: number, to: number }[] = [];

const mathStateField = StateField.define<DecorationSet>({
  update(deco, tr) {
    // 文档变化：必须重建（缓存失效）
    if (tr.docChanged) {
      return buildMathDecorations(tr.state);
    }
    
    // 选择变化：检查是否触及缓存的位置
    if (tr.selection) {
      const oldSel = tr.startState.selection.main;
      const newSel = tr.state.selection.main;
      
      // 检查选区是否与任何公式有交集
      const touchesMath = (sel: { from: number, to: number }) =>
        mathPositionsCache.some(m =>
          sel.from <= m.to && sel.to >= m.from
        );
      
      const oldTouches = touchesMath(oldSel);
      const newTouches = touchesMath(newSel);
      
      // 只有触及状态变化时才重建
      if (oldTouches !== newTouches) {
        return buildMathDecorations(tr.state);
      }
      
      // 在公式内移动也需要重建（更新预览面板位置）
      if (newTouches && (oldSel.from !== newSel.from || oldSel.to !== newSel.to)) {
        return buildMathDecorations(tr.state);
      }
    }
    
    // 其他情况：复用现有装饰
    return deco;
  }
});

function buildMathDecorations(state: EditorState): DecorationSet {
  // 重建时更新缓存
  mathPositionsCache = [];
  
  // ... 解析公式并填充缓存
  mathPositionsCache.push({ from, to });
  
  // ...
}
```

### 6.2 KaTeX 预渲染

KaTeX 渲染是 CPU 密集型操作。使用预渲染缓存和后台队列可以提升体验：

```typescript
// 渲染结果缓存
const katexCache = new Map<string, string>();

// 预渲染队列
let prerenderQueue: { formula: string, displayMode: boolean }[] = [];
let prerenderScheduled = false;

/**
 * 预渲染公式（在空闲时调用）
 */
function prerenderMath(formula: string, displayMode: boolean): void {
  const key = `${formula}|${displayMode}`;
  if (katexCache.has(key)) return;
  
  try {
    const html = katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      strict: false
    });
    katexCache.set(key, html);
  } catch {
    katexCache.set(key, formula);  // 渲染失败时缓存原文
  }
}

/**
 * 调度后台预渲染批次
 */
function schedulePrerenderBatch() {
  if (prerenderScheduled || prerenderQueue.length === 0) return;
  prerenderScheduled = true;
  
  // 使用 requestIdleCallback 在空闲时执行
  const callback = () => {
    const batch = prerenderQueue.splice(0, 5);  // 每次处理 5 个
    batch.forEach(({ formula, displayMode }) => {
      prerenderMath(formula, displayMode);
    });
    prerenderScheduled = false;
    
    // 如果还有待处理的，继续调度
    if (prerenderQueue.length > 0) {
      schedulePrerenderBatch();
    }
  };
  
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(callback, { timeout: 100 });
  } else {
    setTimeout(callback, 16);  // 降级到 setTimeout
  }
}

/**
 * 将公式加入预渲染队列
 */
function queuePrerender(formula: string, displayMode: boolean) {
  const key = `${formula}|${displayMode}`;
  if (katexCache.has(key)) return;  // 已缓存
  
  // 避免重复加入队列
  if (!prerenderQueue.some(q => q.formula === formula && q.displayMode === displayMode)) {
    prerenderQueue.push({ formula, displayMode });
    schedulePrerenderBatch();
  }
}

// 在 Widget 中使用缓存
class MathWidget extends WidgetType {
  toDOM() {
    const container = document.createElement("div");
    const cacheKey = `${this.formula}|${this.displayMode}`;
    
    // 尝试使用缓存
    const cached = katexCache.get(cacheKey);
    if (cached) {
      container.innerHTML = cached;
    } else {
      // 缓存未命中，同步渲染并缓存
      try {
        katex.render(this.formula, container, {
          displayMode: this.displayMode,
          throwOnError: false
        });
        katexCache.set(cacheKey, container.innerHTML);
      } catch {
        container.textContent = this.formula;
      }
    }
    
    return container;
  }
}
```

### 6.3 拖拽选择优化

拖拽选择时完全跳过装饰重建：

```typescript
// 事件监听
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});

document.addEventListener('mouseup', () => {
  // 延迟一帧，确保选择已完成
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});

// 在 StateField 中检查
update(deco, tr) {
  const isDragging = tr.state.field(mouseSelectingField, false);
  const wasDragging = tr.startState.field(mouseSelectingField, false);
  
  // 正在拖拽：完全跳过
  if (isDragging) {
    return deco;
  }
  
  // 刚结束拖拽：重建一次
  if (wasDragging && !isDragging) {
    return buildDecorations(tr.state);
  }
  
  // ...
}
```

### 6.4 视口优化（可选）

对于超大文件，可以只处理视口内的内容：

```typescript
const livePreviewPlugin = ViewPlugin.fromClass(class {
  build(view: EditorView) {
    const { from, to } = view.viewport;  // 只处理可见区域
    
    syntaxTree(view.state).iterate({
      from,  // 限制遍历范围
      to,
      enter: (node) => {
        // ...
      }
    });
  }
});
```

---

## 7. Widget 点击交互

点击渲染后的 Widget 时，需要聚焦到源码进行编辑。

### 7.1 点击处理器

```typescript
const handleClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const view = viewRef.current;
  if (!view) return;
  
  // 检测点击的是否是 Widget
  const widgetDom = target.closest(
    '[data-widget-type="math"], [data-widget-type="table"], [data-widget-type="codeblock"]'
  );
  
  if (widgetDom) {
    // 获取 Widget 在文档中的位置
    const pos = view.posAtDOM(widgetDom);
    
    if (pos !== null) {
      e.preventDefault();
      view.focus();
      
      // 将光标移动到 Widget 内部（+1 跳过开头标记）
      view.dispatch({
        selection: { anchor: pos + 1 }
      });
    }
  }
};

// 注册事件
view.contentDOM.addEventListener('mousedown', handleClick);
```

### 7.2 图片 Widget 的特殊处理

图片 Widget 有两种点击行为：
1. 第一次点击：显示图片路径信息
2. 第二次点击：聚焦到源码

```typescript
// 用于跟踪哪些图片显示了信息
const setImageShowInfo = StateEffect.define<{ src: string; show: boolean }>();

const imageInfoField = StateField.define<Set<string>>({
  create: () => new Set(),
  update(val, tr) {
    let result = val;
    for (const e of tr.effects) {
      if (e.is(setImageShowInfo)) {
        result = new Set(result);
        if (e.value.show) {
          result.add(e.value.src);
        } else {
          result.delete(e.value.src);
        }
      }
    }
    return result;
  },
});

// 点击处理
const handleImageClick = (e: MouseEvent) => {
  const imageWidget = target.closest('[data-widget-type="image"]') as HTMLElement;
  if (!imageWidget) return;
  
  const src = imageWidget.dataset.imageSrc;
  if (!src) return;
  
  e.preventDefault();
  
  const showInfoSet = view.state.field(imageInfoField, false) || new Set();
  const isShowing = showInfoSet.has(src);
  
  if (isShowing) {
    // 已显示信息，聚焦到源码
    const doc = view.state.doc.toString();
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = imageRegex.exec(doc)) !== null) {
      if (match[2] === src) {
        view.focus();
        view.dispatch({
          selection: { anchor: match.index + 2 },  // 定位到 alt 文本
          effects: setImageShowInfo.of({ src, show: false })
        });
        return;
      }
    }
  } else {
    // 第一次点击，显示信息
    view.dispatch({
      effects: setImageShowInfo.of({ src, show: true })
    });
  }
};
```

---

## 8. 完整的 StateField 模式

以高亮 `==text==` 为例，展示完整的实现模式：

```typescript
// 位置缓存
let highlightPositionsCache: { from: number, to: number }[] = [];

const highlightStateField = StateField.define<DecorationSet>({
  // 初始化
  create: buildHighlightDecorations,
  
  // 状态更新
  update(deco, tr) {
    // 1. 文档变化或重新配置：必须重建
    if (tr.docChanged || tr.reconfigured) {
      return buildHighlightDecorations(tr.state);
    }
    
    // 2. 拖拽状态处理
    const isDragging = tr.state.field(mouseSelectingField, false);
    const wasDragging = tr.startState.field(mouseSelectingField, false);
    
    if (wasDragging && !isDragging) {
      return buildHighlightDecorations(tr.state);  // 拖拽结束：重建
    }
    if (isDragging) {
      return deco;  // 拖拽中：跳过
    }
    
    // 3. 选择变化：检查是否触及高亮区域
    if (tr.selection) {
      const oldSel = tr.startState.selection.main;
      const newSel = tr.state.selection.main;
      
      const touches = (sel: { from: number, to: number }) =>
        highlightPositionsCache.some(h =>
          sel.from <= h.to && sel.to >= h.from
        );
      
      const oldTouches = touches(oldSel);
      const newTouches = touches(newSel);
      
      if (oldTouches !== newTouches ||
          (newTouches && (oldSel.from !== newSel.from || oldSel.to !== newSel.to))) {
        return buildHighlightDecorations(tr.state);
      }
    }
    
    return deco;
  },
  
  // 提供装饰给视图
  provide: f => EditorView.decorations.from(f),
});

function buildHighlightDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const doc = state.doc.toString();
  const highlightRegex = /==([^=\n]+)==/g;
  const isDrag = state.field(mouseSelectingField, false);
  
  // 更新缓存
  highlightPositionsCache = [];
  
  let match;
  while ((match = highlightRegex.exec(doc)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    highlightPositionsCache.push({ from, to });
    
    const textStart = from + 2;  // 跳过开头的 ==
    const textEnd = to - 2;      // 跳过结尾的 ==
    
    // 检查是否在代码块内（简单检查）
    const lineStart = doc.lastIndexOf('\n', from) + 1;
    const lineText = doc.slice(lineStart, from);
    if (lineText.includes('`')) continue;
    
    const isTouched = shouldShowSource(state, from, to);
    
    // 高亮文本部分始终添加高亮样式
    decorations.push(
      Decoration.mark({ class: "cm-highlight" }).range(textStart, textEnd)
    );
    
    // == 标记使用与加粗/斜体相同的动画类
    const markCls = (isTouched && !isDrag)
      ? "cm-formatting-inline cm-formatting-inline-visible"
      : "cm-formatting-inline";
    
    // 开头的 ==
    decorations.push(
      Decoration.mark({ class: markCls }).range(from, textStart)
    );
    // 结尾的 ==
    decorations.push(
      Decoration.mark({ class: markCls }).range(textEnd, to)
    );
  }
  
  return Decoration.set(decorations.sort((a, b) => a.from - b.from), true);
}
```

---

## 9. 样式主题

### 9.1 完整主题定义

```typescript
const editorTheme = EditorView.theme({
  // ========== 基础样式 ==========
  "&": {
    backgroundColor: "transparent",
    fontSize: "16px",
    height: "100%"
  },
  
  ".cm-content": {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "16px 0",
    caretColor: "hsl(var(--primary))"
  },
  
  ".cm-line": {
    padding: "0 16px",
    lineHeight: "1.75",
    position: "relative"
  },
  
  // ========== 选区样式 ==========
  ".cm-selectionBackground": {
    backgroundColor: "rgba(191, 219, 254, 0.25) !important"
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(191, 219, 254, 0.35) !important"
  },
  
  // ========== 行内标记动画 ==========
  ".cm-formatting-inline": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    whiteSpace: "nowrap",
    verticalAlign: "baseline",
    color: "hsl(var(--muted-foreground) / 0.6)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.85em",
    maxWidth: "0",
    opacity: "0",
    transform: "scaleX(0.8)",
    transition: `
      max-width 0.2s cubic-bezier(0.2, 0, 0.2, 1),
      opacity 0.15s ease-out,
      transform 0.15s ease-out
    `,
    pointerEvents: "none",
  },
  
  ".cm-formatting-inline-visible": {
    maxWidth: "4ch",
    opacity: "1",
    transform: "scaleX(1)",
    margin: "0 1px",
    pointerEvents: "auto",
  },
  
  // ========== 块级标记动画 ==========
  ".cm-formatting-block": {
    display: "inline",
    overflow: "hidden",
    fontSize: "0.01em",
    lineHeight: "inherit",
    opacity: "0",
    color: "hsl(var(--muted-foreground))",
    fontFamily: "'JetBrains Mono', monospace",
    transition: "font-size 0.2s ease-out, opacity 0.2s ease-out",
  },
  
  ".cm-formatting-block-visible": {
    fontSize: "1em",
    opacity: "0.6",
  },
  
  // ========== 标题样式 ==========
  ".cm-header-1": {
    fontSize: "2em",
    fontWeight: "700",
    lineHeight: "1.3",
    color: "hsl(var(--md-heading, var(--foreground)))"
  },
  ".cm-header-2": {
    fontSize: "1.5em",
    fontWeight: "600",
    lineHeight: "1.4",
    color: "hsl(var(--md-heading, var(--foreground)))"
  },
  ".cm-header-3": {
    fontSize: "1.25em",
    fontWeight: "600",
    lineHeight: "1.5",
    color: "hsl(var(--md-heading, var(--foreground)))"
  },
  ".cm-header-4, .cm-header-5, .cm-header-6": {
    fontWeight: "600",
    color: "hsl(var(--md-heading, var(--foreground)))"
  },
  
  // ========== 行内样式 ==========
  ".cm-strong": {
    fontWeight: "700",
    color: "hsl(var(--md-bold, var(--foreground)))"
  },
  ".cm-emphasis": {
    fontStyle: "italic",
    color: "hsl(var(--md-italic, var(--foreground)))"
  },
  ".cm-strikethrough": {
    textDecoration: "line-through",
    color: "hsl(var(--muted-foreground))"
  },
  ".cm-code": {
    backgroundColor: "hsl(var(--muted))",
    padding: "2px 4px",
    borderRadius: "3px",
    fontFamily: "monospace"
  },
  ".cm-link": {
    color: "hsl(var(--md-link, var(--primary)))",
    textDecoration: "underline"
  },
  ".cm-wikilink": {
    color: "hsl(var(--primary))",
    textDecoration: "underline",
    cursor: "pointer"
  },
  ".cm-highlight": {
    backgroundColor: "hsl(50 100% 50% / 0.4)",
    padding: "1px 2px",
    borderRadius: "2px"
  },
  
  // ========== 数学公式样式 ==========
  ".cm-math-inline": {
    display: "inline-block",
    verticalAlign: "middle",
    cursor: "pointer",
    animation: "mathFadeIn 0.15s ease-out",
  },
  ".cm-math-block": {
    display: "block",
    textAlign: "center",
    padding: "0.5em 0",
    overflow: "hidden",
    cursor: "pointer"
  },
  ".cm-math-source": {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    color: "hsl(var(--foreground))",
    fontFamily: "'JetBrains Mono', monospace",
    borderRadius: "4px",
    padding: "2px 4px",
    zIndex: "1",
    position: "relative",
    cursor: "text",
    animation: "mathFadeIn 0.15s ease-out",
  },
  ".cm-math-preview-panel": {
    display: "block",
    textAlign: "center",
    padding: "8px",
    marginTop: "4px",
    marginBottom: "8px",
    border: "1px solid hsl(var(--border) / 0.5)",
    borderRadius: "6px",
    backgroundColor: "hsl(var(--muted) / 0.3)",
    pointerEvents: "none",
    userSelect: "none",
    opacity: "0.95"
  },
  
  // ========== 动画关键帧 ==========
  "@keyframes mathFadeIn": {
    "from": { opacity: "0", transform: "scale(0.95)" },
    "to": { opacity: "1", transform: "scale(1)" },
  },
  
  // ========== 表格样式 ==========
  ".cm-table-widget": {
    display: "block",
    overflowX: "auto",
    cursor: "text"
  },
  ".cm-table-source": {
    fontFamily: "'JetBrains Mono', monospace !important",
    whiteSpace: "pre",
    color: "hsl(var(--foreground))",
    display: "block",
    overflowX: "auto"
  },
  
  // ========== 图片样式 ==========
  ".cm-image-widget": {
    display: "block",
    margin: "8px 0"
  },
  ".cm-image-info": {
    background: "hsl(var(--muted))",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    color: "hsl(var(--muted-foreground))",
    marginBottom: "4px",
    fontFamily: "monospace"
  },
  ".markdown-image": {
    maxWidth: "100%",
    borderRadius: "6px",
    cursor: "pointer"
  },
});
```

### 9.2 CSS 变量说明

主题使用 CSS 变量，方便与应用的主题系统集成：

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `--foreground` | 前景色 | 系统默认 |
| `--primary` | 主色调 | 蓝色 |
| `--muted` | 柔和背景 | 灰色 |
| `--muted-foreground` | 柔和前景 | 浅灰色 |
| `--border` | 边框色 | 灰色 |
| `--md-heading` | 标题颜色 | 继承 foreground |
| `--md-bold` | 粗体颜色 | 继承 foreground |
| `--md-italic` | 斜体颜色 | 继承 foreground |
| `--md-link` | 链接颜色 | 继承 primary |

---

## 10. 依赖项

### 10.1 核心依赖

```json
{
  "dependencies": {
    "@codemirror/state": "^6.4.0",
    "@codemirror/view": "^6.24.0",
    "@codemirror/commands": "^6.3.0",
    "@codemirror/language": "^6.10.0",
    "@codemirror/lang-markdown": "^6.2.0",
    "@lezer/markdown": "^1.2.0"
  }
}
```

### 10.2 可选依赖（按功能）

```json
{
  "optionalDependencies": {
    "katex": "^0.16.9",           // 数学公式渲染
    "lowlight": "^3.1.0",         // 代码语法高亮
    "mermaid": "^10.6.0",         // 图表渲染
    "markdown-it": "^14.0.0"      // Markdown 渲染（用于表格等）
  }
}
```

### 10.3 开发依赖

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/katex": "^0.16.0"
  }
}
```

---

## 11. 使用示例

### 11.1 基础用法

```typescript
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";

// 导入 Live Preview 扩展（假设已打包为 npm 包）
import {
  livePreviewPlugin,
  mathStateField,
  tableStateField,
  codeBlockStateField,
  highlightStateField,
  markdownStylePlugin,
  mouseSelectingField,
  collapseOnSelectionFacet,
  editorTheme
} from "codemirror-obsidian-mode";

// 创建编辑器
const state = EditorState.create({
  doc: `# Hello World

This is **bold** and *italic* text.

Here's some math: $E = mc^2$

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

| Name | Age |
|------|-----|
| Alice | 25 |
| Bob | 30 |

\`\`\`javascript
console.log("Hello, World!");
\`\`\`
`,
  extensions: [
    // 基础扩展
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    markdown({ base: markdownLanguage }),
    EditorView.lineWrapping,
    
    // Live Preview 扩展
    collapseOnSelectionFacet.of(true),  // 启用 Live Preview
    mouseSelectingField,
    livePreviewPlugin,
    mathStateField,
    tableStateField,
    codeBlockStateField,
    highlightStateField,
    markdownStylePlugin,
    editorTheme,
  ],
});

const view = new EditorView({
  state,
  parent: document.getElementById("editor")!,
});

// 设置拖拽检测
view.contentDOM.addEventListener('mousedown', () => {
  view.dispatch({ effects: setMouseSelecting.of(true) });
});
document.addEventListener('mouseup', () => {
  requestAnimationFrame(() => {
    view.dispatch({ effects: setMouseSelecting.of(false) });
  });
});
```

### 11.2 动态切换模式

```typescript
import { Compartment } from "@codemirror/state";

const viewModeCompartment = new Compartment();

// 初始化时
const state = EditorState.create({
  extensions: [
    viewModeCompartment.of(getLivePreviewExtensions()),
    // ...
  ],
});

// 切换到源码模式
function switchToSourceMode() {
  view.dispatch({
    effects: viewModeCompartment.reconfigure([
      collapseOnSelectionFacet.of(false),
      // 只保留基础样式，不隐藏标记
    ])
  });
}

// 切换到 Live Preview 模式
function switchToLiveMode() {
  view.dispatch({
    effects: viewModeCompartment.reconfigure([
      collapseOnSelectionFacet.of(true),
      livePreviewPlugin,
      mathStateField,
      // ...
    ])
  });
}
```

### 11.3 React 集成

```tsx
import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  mode: 'live' | 'source';
}

export function MarkdownEditor({ value, onChange, mode }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const state = EditorState.create({
      doc: value,
      extensions: [
        // ... 扩展配置
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
    });
    
    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    
    viewRef.current = view;
    
    return () => {
      view.destroy();
    };
  }, []);
  
  // 外部值变化时更新
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    
    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value
        }
      });
    }
  }, [value]);
  
  return <div ref={containerRef} className="editor-container" />;
}
```

---

## 12. 已知限制

1. **嵌套标记**：如 `***bold italic***` 的处理可能不完美，因为语法树节点可能重叠
2. **大文件性能**：超过 10000 行的文件可能有性能问题，建议启用视口优化
3. **复杂表格**：合并单元格、多行单元格等高级表格语法不支持
4. **实时协作**：当前实现不支持多人协作编辑（需要集成 Yjs 等）
5. **移动端**：触摸事件处理可能需要额外优化
6. **IME 输入**：中文等 IME 输入时可能有闪烁问题

---

## 13. 与其他方案对比

| 特性 | 本方案 | ink-mde | codemirror-rich-markdoc | Obsidian |
|------|--------|---------|-------------------------|----------|
| 光标进入显示标记 | ✅ | ❌ | ✅ | ✅ |
| 动画过渡 | ✅ | ❌ | ❌ | ✅ |
| 数学公式 | ✅ | ❌ | ❌ | ✅ (插件) |
| 表格渲染 | ✅ | ❌ | ✅ | ✅ |
| 代码块高亮 | ✅ | ✅ | ✅ | ✅ |
| 图片预览 | ✅ | ✅ | ❌ | ✅ |
| Mermaid 图表 | ✅ | ❌ | ❌ | ✅ (插件) |
| 拖拽优化 | ✅ | ❌ | ❌ | ✅ |
| 开源 | ✅ | ✅ | ✅ | ❌ |
| 活跃维护 | ✅ | ✅ | ❌ (2年) | ✅ |
| npm 包 | 计划中 | ✅ | ❌ | N/A |

---

## 14. 后续优化方向

1. **抽离为独立 npm 包**
   - 解耦业务逻辑
   - 提供配置化 API
   - 支持 Tree-shaking

2. **虚拟滚动**
   - 只渲染视口内的 Widget
   - 支持超大文件（10万行+）

3. **插件系统**
   - 允许用户扩展自定义语法
   - 提供钩子函数

4. **协作编辑**
   - 集成 Yjs 等 CRDT 库
   - 支持多人实时编辑

5. **移动端适配**
   - 触摸事件优化
   - 虚拟键盘适配

6. **无障碍支持**
   - ARIA 属性
   - 屏幕阅读器支持

---

## 附录：完整文件结构（npm 包规划）

```
codemirror-obsidian-mode/
├── src/
│   ├── index.ts              # 主入口，导出所有公共 API
│   ├── core/
│   │   ├── shouldShowSource.ts   # 核心判断函数
│   │   ├── mouseSelecting.ts     # 拖拽状态管理
│   │   └── facets.ts             # Facet 定义
│   ├── plugins/
│   │   ├── livePreview.ts        # Live Preview 插件
│   │   ├── readingMode.ts        # Reading 模式插件
│   │   └── markdownStyle.ts      # Markdown 样式插件
│   ├── fields/
│   │   ├── math.ts               # 数学公式 StateField
│   │   ├── table.ts              # 表格 StateField
│   │   ├── codeBlock.ts          # 代码块 StateField
│   │   ├── highlight.ts          # 高亮 StateField
│   │   └── image.ts              # 图片 StateField
│   ├── widgets/
│   │   ├── MathWidget.ts         # 数学公式 Widget
│   │   ├── TableWidget.ts        # 表格 Widget
│   │   ├── CodeBlockWidget.ts    # 代码块 Widget
│   │   ├── MermaidWidget.ts      # Mermaid Widget
│   │   └── ImageWidget.ts        # 图片 Widget
│   ├── theme/
│   │   └── default.ts            # 默认主题
│   └── utils/
│       ├── katexCache.ts         # KaTeX 缓存
│       └── positionCache.ts      # 位置缓存工具
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```
