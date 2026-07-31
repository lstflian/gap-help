## 0.3.0

**Added**

1. Appearance setting `gap-help.docAppearance` (system / dark / light) for all GAP manuals, including packages without their own dark styles
2. MathJax setting `gap-help.mathJax` with a global on/off switch, synced with the link inside the docs
3. Dark mode polish for code blocks and function blocks
4. The GAP style chooser (Style link) now works inside the webview and persists globally

**Fixed**

1. Webview resources from the extension were blocked (styles never loaded)
2. MathJax toggling jumped the scroll position
3. MathJax v2/v3 double rendering on MathJax pages
4. Various link parsing and navigation edge cases

## 0.2.0

**Added**

1. Prebuilt index data for GAP 4.13.1 / 4.14.0 / 4.15.0 / 4.16.0
2. `gap-help.gapPath` setting for configuring the GAP installation path
3. Linux and macOS support
4. Changing the GAP path takes effect immediately

**Removed**

1. Automatic PATH detection

**Fixed**

1. Silent search failures when the index was not loaded
2. Wrong error message on Windows when `gap` was missing from PATH

## 0.1.1

1. Initial release
2. Search GAP help entries via QuickPick with real-time results
3. Word-selection lookup from GAP code
4. Two search modes: prefix (?topic) and substring (??topic)
5. Webview panel rendering with MathJax support
6. Book filtering in search results
7. Context menu integration: Help in GAP, Open GAP Reference Manual
8. Automatic help index generation on first activation
9. Manual index rebuild command 