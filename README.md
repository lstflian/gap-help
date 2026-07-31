# GAP Help

[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![GAP](https://img.shields.io/badge/GAP-4.13.1+-green)](https://www.gap-system.org/)

English | [简体中文](README.zh-cn.md)

Search and read GAP documentation directly in VS Code.

Supports word-selection lookup, real-time QuickPick search (matching the behavior of GAP's `?help` and `??help`), with results displayed in a webview panel that supports in-page link navigation and MathJax math rendering.

> GAP is a system for computational discrete algebra, with particular emphasis on computational group theory, and is widely used in mathematical research. GAP comes with comprehensive built-in documentation. This extension builds on GAP's native help system, aiming to help GAP users learn and work with GAP more conveniently. For more information, see the [GAP official website](https://www.gap-system.org/).

## Prerequisites

After installing, open VS Code settings (`Ctrl+,`), search for `gap-help.gapPath`, and enter the path to your GAP installation root (the folder containing `doc/` and `pkg/`).

- **Windows example**: `C:\Program Files\GAP-4.16.0\runtime\opt\gap-4.16.0`
- **Linux/Mac example**: `/home/user/gap-4.16.0`

> Prebuilt index data is included for GAP 4.13.1 / 4.14.0 / 4.15.0 / 4.16.0. Just set the path and the extension is ready to use.
> For other versions, run `GAP: Rebuild Help Index` to manually build the index (Windows users need GAP in their system PATH).

The path takes effect immediately, no restart needed.

### Windows: add GAP to PATH for manual rebuild

To manually rebuild the index on Windows, make sure GAP is added to the system PATH first. Using GAP 4.16.0 as an example, run the following in PowerShell (replace with your actual installation path):

```powershell
$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
[Environment]::SetEnvironmentVariable('PATH', $userPath + ';C:\Program Files\GAP-4.16.0\runtime\opt\gap-4.16.0;C:\Program Files\GAP-4.16.0\runtime\bin', 'User')
```

Restart your terminal and run `gap --version` to verify.

## Features

- Prebuilt index data for GAP 4.13.1~4.16.0: ready to use once the path is set.
- Two search modes, switchable in settings or from the QuickPick search box:
  - **prefix**: equivalent to GAP's `?help`
  - **substring**: equivalent to GAP's `??help`
- For other GAP versions, manually rebuild by pressing `Ctrl+Shift+P` and typing `GAP: Rebuild Help Index`.
- Search results are displayed in a webview panel with support for in-page link navigation and MathJax math rendering.
- Document appearance is globally controllable: `system` follows the VS Code theme, `dark` / `light` force a mode for all manuals, and the `[Style]` link inside the docs adjusts it.
- MathJax has a global switch, synced bidirectionally with the `[MathJax on/off]` link inside the docs, and toggling keeps your scroll position.

## Settings

| Setting | Default | Description |
|---|---|---|
| `gap-help.gapPath` | (empty) | GAP installation root (the folder containing `doc/` and `pkg/`) |
| `gap-help.searchMode` | `prefix` | Search mode: `prefix` matches `?help` (from word start), `substring` matches `??help` (anywhere) |
| `gap-help.helpStyle` | `native` | Page rendering style. Currently only `native` (GAP's original look) |
| `gap-help.docAppearance` | `system` | Document appearance: `system` follows the VS Code theme, `dark` / `light` force a mode for all manuals |
| `gap-help.mathJax` | `true` | Render math with MathJax. Synced with the `[MathJax on/off]` link inside the docs |

## Demonstration

The following demonstrates the main features: word-selection lookup, QuickPick search, book filtering, opening the GAP Reference Manual from the context menu, and in-page link navigation within the webview panel.

### Word-Selection Lookup

Select a word in GAP code, right-click and choose `Help in GAP`.

<img src="images/searchWord.gif" alt="Search demo" width="800" />

### QuickPick Search

Press `Ctrl+Shift+P` and type `GAP: Help in GAP`, or right-click in the editor and choose `Help in GAP` to open the QuickPick search box. Type your query and select a result to view it.

<img src="images/quickpickSearch.gif" alt="Search demo" width="800" />

### Book Filtering

Click the filter button in the QuickPick search box to limit the search to selected books.

<img src="images/filterBooks.gif" alt="Filter demo" width="800" />

You can also search first and filter by book afterwards.

<img src="images/filterBookslater.gif" alt="Filter demo" width="800" />

### GAP Reference Manual & In-Page Navigation

Open the GAP Reference Manual from the context menu. Click any link within the webview panel to navigate between pages.

<img src="images/GAPRef.gif" alt="Reference manual demo" width="800" />

## Development

First install dependencies and compile the TypeScript sources:

```bash
npm install
npm run compile
```

Then press `F5` to launch debugging.

## License

[MIT](LICENSE)
