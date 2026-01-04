# 🗺️ Roadmap

## 🎯 Project Philosophy

**codemirror-live-markdown** is a **composable plugin collection** for adding Obsidian-style Live Preview to CodeMirror 6.

### Design Principles

1. **Modular by Design** - Each feature is a separate plugin you can import independently
2. **Zero Forced Dependencies** - Only install what you need (math? tables? your choice)
3. **Flexible Integration** - Works alongside any other CodeMirror extensions
4. **Simple API** - Direct plugin imports, no complex configuration system

### How It Differs from Similar Projects

Unlike editor frameworks (e.g., ProseMark) that provide an all-in-one setup, this project gives you building blocks:

```typescript
// Framework approach: all-or-nothing
prosemarkBasicSetup()  // includes everything

// Our approach: pick what you need
import { livePreviewPlugin, mathPlugin, tablePlugin } from 'codemirror-live-markdown';

extensions: [
  livePreviewPlugin,
  mathPlugin({ inline: true }),  // configurable
  // tablePlugin,  // don't need tables? don't import it
]
```

**Best for:**
- Adding Live Preview to an existing CodeMirror editor
- Projects that need fine-grained control over features
- Minimizing bundle size by only including used features
- Developers who prefer explicit over implicit configuration

---

## Version Strategy

We follow [Semantic Versioning](https://semver.org/):
- **0.x.x** - Initial development, API may change
- **1.0.0** - First stable release
- **alpha** - Early testing, incomplete features
- **beta** - Feature complete, testing phase
- **rc** - Release candidate, ready for production

---

## 📦 Release Plan

### ✅ v0.1.0-alpha.1 (Current)
**Status:** Ready to release  
**Focus:** Core Live Preview functionality

**Features:**
- ✅ Core Live Preview mechanism
- ✅ Inline markers (bold, italic, strikethrough, code)
- ✅ Block markers (headers, lists, quotes)
- ✅ Smooth animations
- ✅ Drag selection optimization
- ✅ TypeScript support
- ✅ Working demo

**Installation:**
```bash
npm install codemirror-live-markdown@alpha
```

---

### ✅ v0.2.0-alpha.1
**Status:** Released  
**Focus:** Math formulas

**Features:**
- ✅ Inline math: `$E = mc^2$`
- ✅ Block math: ` ```math ... ``` `
- ✅ KaTeX rendering
- ✅ Edit mode with source highlighting
- ✅ Formula caching for performance
- ✅ Click to edit
- ✅ Error handling for invalid LaTeX

**Breaking Changes:** None

---

### ✅ v0.3.0-alpha.1 (Current)
**Status:** Released  
**Focus:** Tables

**Features:**
- ✅ Markdown table rendering
- ✅ Table widget with HTML output
- ✅ Click to edit source
- ✅ Table alignment support (left, center, right)
- ✅ Edit mode with source highlighting

**Breaking Changes:** None

---

### ✅ v0.4.0-alpha.1
**Status:** Released  
**Focus:** Code blocks

**Features:**
- ✅ Syntax highlighting (highlight.js)
- ✅ Language detection
- ✅ Code block widget
- ✅ Copy button
- ✅ Line numbers (optional)
- ✅ Click to edit

**Breaking Changes:** None

---

### 🔮 v0.5.0-alpha.1
**ETA:** 4-5 weeks  
**Focus:** Images & Links

**Planned Features:**
- [ ] Image preview
- [ ] Local/remote image support
- [ ] Image info display
- [ ] Wiki-style links `[[page]]`
- [ ] Link preview on hover

**Breaking Changes:** None

---

### 🔮 v0.6.0-beta.1
**ETA:** 6-7 weeks  
**Focus:** Polish & Testing

**Goals:**
- [ ] Comprehensive test coverage (>80%)
- [ ] Performance optimization
- [ ] Bug fixes from alpha feedback
- [ ] Documentation improvements
- [ ] Accessibility improvements

**Breaking Changes:** Possible API refinements

---

### 🎯 v1.0.0
**ETA:** 2-3 months  
**Focus:** Stable Release

**Requirements:**
- ✅ All core features implemented
- ✅ Test coverage >80%
- ✅ Documentation complete
- ✅ No critical bugs
- ✅ API stable
- ✅ Community feedback addressed

**Features:**
- All features from alpha/beta versions
- Stable API
- Production-ready
- Long-term support

---

## 🎨 Future Enhancements (Post 1.0)

### v1.1.0 - Advanced Features
- [ ] Mermaid diagrams
- [ ] Callout blocks
- [ ] Task lists with checkboxes
- [ ] Footnotes
- [ ] Table of contents

### v1.2.0 - Customization
- [ ] Plugin system
- [ ] Custom widget API
- [ ] Theme customization API
- [ ] Custom syntax support

### v1.3.0 - Performance
- [ ] Virtual scrolling for large documents
- [ ] Lazy loading for widgets
- [ ] Web Worker support
- [ ] Incremental rendering

### v2.0.0 - Major Update
- [ ] Collaborative editing (Yjs integration)
- [ ] Mobile optimization
- [ ] Real-time sync
- [ ] Advanced IME support

---

## 📊 Version Comparison

| Version | Status | Features | Stability | Recommended For |
|---------|--------|----------|-----------|-----------------|
| 0.1.x-alpha | ✅ Released | Basic | Low | Early adopters, testing |
| 0.2.x-alpha | ✅ Released | + Math | Low | Math-heavy users |
| 0.3.x-alpha | � Curnrent | + Tables | Low | Documentation |
| 0.4.x-alpha | 🔵 Planned | + Code | Low | Technical writing |
| 0.5.x-alpha | 🔵 Planned | + Images | Low | Rich content |
| 0.6.x-beta | 🔵 Planned | All features | Medium | Beta testing |
| 1.0.0 | 🔵 Planned | Complete | High | Production use |

---

## 🤝 Contributing

Want to help? Check out:
- [Open Issues](https://github.com/blueberrycongee/codemirror-live-markdown/issues)
- [Good First Issues](https://github.com/blueberrycongee/codemirror-live-markdown/labels/good%20first%20issue)

---

## 📝 Notes

- **Alpha versions** may have bugs and incomplete features
- **API may change** before 1.0.0
- **Feedback welcome** - open an issue or discussion
- **Timelines are estimates** and may change based on feedback

---

**Last Updated:** 2026-01-04
