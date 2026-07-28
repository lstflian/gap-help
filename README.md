# GAP Help

[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![GAP](https://img.shields.io/badge/GAP-4.13.0+-green)](https://www.gap-system.org/)

English | [简体中文](README.zh-cn.md)

Search and read GAP documentation directly in VS Code.

Supports word-selection lookup, real-time QuickPick search (matching the behavior of GAP's `?help` and `??help`), with results displayed in a webview panel that supports in-page link navigation and MathJax math rendering.

> GAP is a system for computational discrete algebra, with particular emphasis on computational group theory, and is widely used in mathematical research. GAP comes with comprehensive built-in documentation. This extension builds on GAP's native help system, aiming to help GAP users learn and work with GAP more conveniently. For more information, see the [GAP official website](https://www.gap-system.org/).

## Prerequisites

This extension works with GAP for Windows (the .exe installer) and requires GAP to be in your system `PATH`.

**1. Add GAP to `PATH`**

Using GAP 4.16.0 as an example, run the following in PowerShell (replace the path with your actual installation path):

```powershell
$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
[Environment]::SetEnvironmentVariable('PATH', $userPath + ';C:\Program Files\GAP-4.16.0\runtime\opt\gap-4.16.0;C:\Program Files\GAP-4.16.0\runtime\bin', 'User')
```

**2. Verify the installation**

After restarting your terminal, run the following command to confirm `gap` is correctly added:

```bash
gap --version
```

## Features

- On first activation, the extension automatically generates the help index. You can manually rebuild it later by pressing `Ctrl+Shift+P` and typing `GAP: Rebuild Help Index`.

- Two search modes, switchable in settings or from the QuickPick search box:
  - **prefix**: equivalent to GAP's `?help`
  - **substring**: equivalent to GAP's `??help`

- Search results are displayed in a webview panel with support for in-page link navigation and MathJax math rendering.

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
