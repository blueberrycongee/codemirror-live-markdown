# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0-alpha.1] - 2026-01-03

### Added
- **Math Formula Support** 🧮
  - Inline math formulas using `` `$...$` `` syntax
  - Block math formulas using ` ```math ... ``` ` code blocks
  - KaTeX rendering with caching for performance
  - Edit mode with source highlighting
  - Error handling for invalid LaTeX
  - Click to edit rendered formulas
  - Smooth transitions between render and edit modes

### New Files
- `src/utils/mathCache.ts` - Math rendering cache
- `src/plugins/math.ts` - Math formula plugin (inline + block)
- `src/widgets/mathWidget.ts` - Math formula widget
- `src/plugins/__tests__/math.test.ts` - Math plugin tests

### Changed
- Updated `package.json` to version 0.2.0-alpha.1
- Added KaTeX as optional peer dependency
- Updated README.md with math formula documentation
- Updated README.zh-CN.md with math formula documentation (Chinese)
- Updated ROADMAP.md to mark v0.2.0 as complete
- Enhanced demo with math formula examples
- Added KaTeX CDN links to demo HTML

### Fixed
- **Block math decorations** - Fixed "Block decorations may not be specified via plugins" error by using StateField instead of ViewPlugin for block-level decorations
- **Inline math cursor visibility** - Fixed cursor not visible when editing inline math formulas by removing horizontal padding from `.cm-math-source` style
- **Math formula CodeMark conflict** - Fixed conflict with livePreviewPlugin by skipping math formula CodeMark nodes

### Technical
- Maintained zero dependencies principle (KaTeX is peer dependency)
- Full TypeScript support with complete type definitions
- Comprehensive JSDoc comments
- Test coverage for core functionality
- ESLint and Prettier compliant
- Separated inline math (ViewPlugin) and block math (StateField) for CodeMirror 6 compatibility

## [0.1.0-alpha.1] - 2026-01-02

### Added
- Initial release
- Core Live Preview mechanism
- Inline markers (bold, italic, strikethrough, code)
- Block markers (headers, lists, quotes)
- Smooth CSS animations
- Drag selection optimization
- TypeScript support
- Working demo
- Comprehensive documentation

[0.2.0-alpha.1]: https://github.com/blueberrycongee/codemirror-live-markdown/compare/v0.1.0-alpha.1...v0.2.0-alpha.1
[0.1.0-alpha.1]: https://github.com/blueberrycongee/codemirror-live-markdown/releases/tag/v0.1.0-alpha.1
