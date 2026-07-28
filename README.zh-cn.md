# GAP Help

[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)

[English](README.md) | 简体中文

在 VS Code 中搜索和阅读 GAP 帮助文档。

支持划词查询、QuickPick 实时搜索（行为与 GAP 中 `?help` 和 `??help` 一致），结果在 Webview 面板中展示，并支持页内链接跳转和 MathJax 数学公式渲染。

> GAP 是一个计算离散代数的系统，特别侧重于群论计算，在数学研究中有广泛应用。GAP 内置了非常完善的帮助文档，本扩展基于 GAP 原生帮助系统开发，希望帮助 GAP 用户更便捷地使用和学习 GAP。更多信息请见 [GAP 官方网站](https://www.gap-system.org/)。

## 前置条件

使用本扩展前，请确保已将 GAP 添加到系统 PATH。如果未添加，扩展将无法正常工作。

下面以 GAP 4.16.0 为例，在 PowerShell 中执行以下命令（请将路径替换为 GAP 的实际安装路径）：

```powershell
[Environment]::SetEnvironmentVariable('PATH', $env:PATH + ';C:\Program Files\GAP-4.16.0\runtime\opt\gap-4.16.0', 'User')
```

验证 GAP 是否成功添加，运行：

```powershell
gap --version
```

## 功能说明

- 扩展首次激活时自动生成帮助索引文件，后续可通过 `Ctrl+Shift+P` 输入 `GAP: Rebuild Help Index` 手动重建。

- 支持两种搜索模式，可在设置或 QuickPick 搜索框中随时切换：
  - **prefix**：对应 GAP 中的 `?help`
  - **substring**：对应 GAP 中的 `??help`

- 搜索结果在 Webview 面板中展示，支持页内链接跳转和 MathJax 数学公式渲染。

## 功能演示

以下演示了本扩展的主要功能：划词查询、QuickPick 搜索、书籍筛选、右键菜单打开 GAP Reference Manual 以及 Webview 面板内的链接跳转。

### 划词查询

在 GAP 代码中选中一词，右键选择 `Help in GAP` 即可查询。

<img src="images/searchWord.gif" alt="搜索演示" width="800" />

### QuickPick 搜索

通过 `Ctrl+Shift+P` 输入 `GAP: Help in GAP`，或在编辑器中右键点击 `Help in GAP`，打开 QuickPick 搜索框，输入内容后点击结果查看。

<img src="images/quickpickSearch.gif" alt="搜索演示" width="800" />

### 书籍筛选

在 QuickPick 搜索框中点击筛选按钮，限定在指定书籍范围内搜索。

<img src="images/filterBooks.gif" alt="筛选演示" width="800" />

同样支持先搜索后筛选书籍。

<img src="images/filterBookslater.gif" alt="筛选演示" width="800" />

### GAP Reference Manual 与页内跳转

右键菜单可直接打开 GAP Reference Manual，Webview 面板内点击链接可在页面间跳转。

<img src="images/GAPRef.gif" alt="参考手册演示" width="800" />

## 开发

```bash
npm install
npm run compile
```

之后按 F5 即可启动调试。

## 许可证
[MIT](LICENSE)