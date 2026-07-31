# GAP Help

[![License](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![GAP](https://img.shields.io/badge/GAP-4.13.1+-green)](https://www.gap-system.org/)

[English](README.md) | 简体中文

在 VS Code 中搜索和阅读 GAP 帮助文档。

支持划词查询、QuickPick 实时搜索（行为与 GAP 中 `?help` 和 `??help` 一致），结果在 Webview 面板中展示，并支持页内链接跳转和 MathJax 数学公式渲染。

> GAP 是一个计算离散代数的系统，特别侧重于群论计算，在数学研究中有广泛应用。GAP 内置了非常完善的帮助文档，本扩展基于 GAP 原生帮助系统开发，希望帮助 GAP 用户更便捷地使用和学习 GAP。更多信息请见 [GAP 官方网站](https://www.gap-system.org/)。

## 前置条件

安装扩展后，打开 VS Code 设置（`Ctrl+,`），搜索 `gap-help.gapPath`，填入 GAP 安装根目录（需包含 `doc/` 和 `pkg/` 子文件夹）。

- **Windows 示例**：`C:\Program Files\GAP-4.16.0\runtime\opt\gap-4.16.0`
- **Linux/Mac 示例**：`/home/user/gap-4.16.0`

> 内置了 GAP 4.13.1 / 4.14.0 / 4.15.0 / 4.16.0 的索引数据，以上版本设置路径后即可使用，无需额外操作。
> 若使用其他版本，需要手动运行 `GAP: Rebuild Help Index` 重建索引（Windows 需将 GAP 添加到系统 PATH）。

路径设置后即时生效，无需重启 VS Code。

### Windows：手动重建需添加 GAP 到 PATH

如果需要在 Windows 中手动重建索引数据，需要先将 GAP 添加到系统 PATH。以 GAP 4.16.0 为例，在 PowerShell 中执行（请将路径替换为实际安装路径）：

```powershell
$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User')
[Environment]::SetEnvironmentVariable('PATH', $userPath + ';C:\Program Files\GAP-4.16.0\runtime\opt\gap-4.16.0;C:\Program Files\GAP-4.16.0\runtime\bin', 'User')
```

重启终端后运行 `gap --version` 确认添加成功。

## 主要功能说明

- 内置 GAP 4.13.1~4.16.0 的索引数据，设置路径后即刻可用。
- 支持两种搜索模式，可在设置或 QuickPick 搜索框中随时切换：
  - **prefix**：对应 GAP 中的 `?help`
  - **substring**：对应 GAP 中的 `??help`
- 使用其他 GAP 版本时，通过 `Ctrl+Shift+P` 输入 `GAP: Rebuild Help Index` 手动重建索引。
- 搜索结果在 Webview 面板中展示，支持页内链接跳转和 MathJax 数学公式渲染。
- 文档外观可全局控制：`system` 跟随 VS Code 主题，`dark` / `light` 对所有文档强制生效，也可通过文档内的 `[Style]` 链接调整。
- MathJax 支持全局开关，与文档内 `[MathJax on/off]` 链接双向同步，切换后保持浏览位置。

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

## 设置项

| 设置项 | 默认值 | 说明 |
|---|---|---|
| `gap-help.gapPath` | （空） | GAP 安装根目录（包含 `doc/` 和 `pkg/` 的文件夹） |
| `gap-help.searchMode` | `prefix` | 搜索模式：`prefix` 对应 `?help`，`substring` 对应 `??help` |
| `gap-help.helpStyle` | `native` | 页面渲染风格，目前仅 `native`（GAP 原生外观） |
| `gap-help.docAppearance` | `system` | 文档外观：`system` 跟随 VS Code 主题，`dark` / `light` 对所有文档强制生效 |
| `gap-help.mathJax` | `true` | 是否用 MathJax 渲染文档中的数学公式，与文档内 `[MathJax on/off]` 链接同步 |

## 开发

首先安装依赖并编译 TypeScript 源码：

```bash
npm install
npm run compile
```

之后按 `F5` 即可启动调试。

## 许可证
[MIT](LICENSE)