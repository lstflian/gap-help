/**
 * This file does the following:
 * 
 * 1. Read gap-help.gapPath configuration to find GAP installation.
 * 2. Detect GAP version from the path and match against prebuilt index data.
 * 3. Copy matching prebuilt index to the data directory, or prompt the user to rebuild.
 * 4. Load index data into memory.
 * 5. Register commands:
 *    - Search.
 *    - Open GAP Reference Manual.
 *    - Manual Rebuild Index.
*/

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { loadIndex, HelpEntry } from './indexData';
import { searchHelp } from './searchEngine';
import { showLiveSearchPicker } from './searchPicker';
import { showHelpPanel, refreshCurrentPage } from './helpPanel';
import { initStyleState } from './styleState';

let allEntries: HelpEntry[] = [];
let bookDescriptions: Map<string, string> = new Map();
let gapRoot: string = '';
let initializing = false;
let justCopied = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Registers commands, runs initialization, and listens for config changes.
 */
export async function activate(context: vscode.ExtensionContext) {
    const dataDir = path.join(context.globalStorageUri.fsPath, 'data');
    if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
    const metaFile = path.join(dataDir, '.gap_root');

    initStyleState(context);

    registerCommands(context, dataDir, metaFile);

    // Register the config listener before the possibly long initialization, so user changes during activation are not lost.
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('gap-help.gapPath')) {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => initializeHelp(context, dataDir, metaFile), 1000);
            }
            // MathJax switch: re-render the open page immediately.
            if (e.affectsConfiguration('gap-help.mathJax')) {
                refreshCurrentPage();
            }
        })
    );

    await initializeHelp(context, dataDir, metaFile);
}

export function deactivate() {}

// Initialization

/**
 * Check gapPath, match against prebuilt index, and load entries.
 */
async function initializeHelp(context: vscode.ExtensionContext, dataDir: string, metaFile: string): Promise<void> {
    if (initializing) return;
    initializing = true;
    try {
        const cfg = vscode.workspace.getConfiguration('gap-help');
        const newRoot = (cfg.get<string>('gapPath') || '').trim();

        // Step 1. Validate path
        if (!isValidGapRoot(newRoot)) {
            if (gapRoot) {
                gapRoot = '';
                allEntries = [];
                bookDescriptions = new Map();
            }
            vscode.window.showWarningMessage(
                'GAP Help: Please set "gap-help.gapPath" to a valid GAP installation root (the folder containing doc/ and pkg/).',
                'Open Settings'
            ).then(action => {
                if (action === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'gap-help.gapPath');
                }
            });
            return;
        }


        gapRoot = newRoot;

        // Step 2. Match prebuilt index
        const builtinVersions = getBuiltinVersions(context);
        const userVersion = extractVersionFromPath(gapRoot);
        const matched = userVersion && builtinVersions.includes(userVersion) ? userVersion : null;

        const cached = safeRead(metaFile);
        const versionSame = cached === (userVersion || gapRoot);

        // Same version, reuse what we have
        if (versionSame) {
            if (!allEntries.length) {
                try {
                    const loaded = loadIndex(dataDir);
                    allEntries = loaded.entries;
                    bookDescriptions = loaded.bookDescriptions;
                } catch (e: any) {
                    vscode.window.showErrorMessage(`GAP Help: Failed to load help index: ${e.message}`);
                }
            }
            return;
        }

        if (matched) {
            // Copy prebuilt index if cached version differs
            if (safeRead(metaFile) !== matched) {
                try {
                    const src = path.join(context.extensionPath, 'indexdata', matched);
                    for (const name of ['export_gapdoc.txt', 'export_default.txt', 'export_text.txt']) {
                        fs.copyFileSync(path.join(src, name), path.join(dataDir, name));
                    }
                    fs.writeFileSync(metaFile, matched);
                    allEntries = [];
                    bookDescriptions = new Map();
                    justCopied = true;
                } catch (e: any) {
                    vscode.window.showErrorMessage(`GAP Help: Failed to copy prebuilt index: ${e.message}`);
                }
            }
        } else if (safeRead(metaFile) !== (userVersion || gapRoot)) {
            // No prebuilt index for this version, need to rebuild
            // Clear any stale data from a different version first
            for (const name of ['export_gapdoc.txt', 'export_default.txt', 'export_text.txt']) {
                try { fs.unlinkSync(path.join(dataDir, name)); } catch (_) { }
            }
            allEntries = [];
            bookDescriptions = new Map();
            const action = await vscode.window.showWarningMessage(
                `GAP Help: No prebuilt index for GAP version "${userVersion || 'unknown'}". Rebuild now?`,
                'Rebuild'
            );
            if (action === 'Rebuild') {
                try {
                    await doRebuild(context, dataDir, metaFile, gapRoot);
                } catch (e: any) {
                    vscode.window.showErrorMessage(`GAP Help: Rebuild failed: ${e.message}`);
                }
            }
        }

        // Step 3. Load entries
        if (!allEntries.length) {
            try {
                const loaded = loadIndex(dataDir);
                allEntries = loaded.entries;
                bookDescriptions = loaded.bookDescriptions;
            } catch (e: any) {
                vscode.window.showErrorMessage(`GAP Help: Failed to load help index: ${e.message}`);
            }
        }
        if (justCopied && allEntries.length) {
            vscode.window.showInformationMessage(
                'GAP Help: Using prebuilt index, or use "GAP: Rebuild Help Index" to rebuild manually.'
            );
        }

    } finally {
        justCopied = false;
        initializing = false;
    }
}

/**
 * Run GAP export scripts to generate help index, then load the result.
 */
async function doRebuild(context: vscode.ExtensionContext, dataDir: string, metaFile: string, gRoot: string) {
    const gapBin = findGapBinary(gRoot);
    if (!gapBin) {
        if (process.platform === 'win32') {
            throw new Error('Cannot find `gap` command. Make sure GAP is installed and in your PATH.');
        }
        throw new Error('Cannot find gap executable. Make sure "gap-help.gapPath" points to the correct GAP root folder.');
    }

    // Windows: use PATH ('gap' resolves via cmd). Linux/Mac: use the found path;
    const gapCmd = process.platform === 'win32'
        ? 'gap'
        : gapBin.endsWith('.sh') ? `sh "${gapBin}"` : `"${gapBin}"`;

    const scripts = path.join(context.extensionPath, 'scripts');
    const exp = path.join(scripts, 'export.g');
    const expt = path.join(scripts, 'export_text.g');
    const conv = path.join(scripts, 'convert_export.js');
    if (!fs.existsSync(scripts) || !fs.existsSync(exp)) return;

    const done = vscode.window.setStatusBarMessage('$(sync~spin) GAP Help: building index…');
    try {
        await execAsync(`${gapCmd} -q --nointeract "${exp}"`, { cwd: dataDir, timeout: 300000 });
        if (fs.existsSync(conv)) { runConvertScript(conv, dataDir); }
        if (fs.existsSync(expt)) { await execAsync(`${gapCmd} -q --nointeract "${expt}"`, { cwd: dataDir, timeout: 60000 }); }
    } finally {
        done.dispose();
    }

    const loaded = loadIndex(dataDir);
    allEntries = loaded.entries;
    bookDescriptions = loaded.bookDescriptions;
    
    // Write the detected GAP version as the cache key
    const ver = extractVersionFromPath(gRoot) || gRoot;
    fs.writeFileSync(metaFile, ver);
    vscode.window.showInformationMessage(`GAP Help: Help index ready ✓`);
}

// Commands 

/**
 * Register the three commands with VS Code:
 *   - gap-help.search:        Live search through all help entries
 *   - gap-help.openReference: Open the GAP Reference Manual in a webview
 *   - gap-help.rebuild:       Clear cache and regenerate the index
 */
function registerCommands(ctx: vscode.ExtensionContext, dataDir: string, metaFile: string) {

    // Search
    ctx.subscriptions.push(vscode.commands.registerCommand('gap-help.search', async () => {
        if (!checkGapPath()) return;
        if (!allEntries.length) {
            vscode.window.showWarningMessage('GAP Help: Help index not loaded. Try running "GAP: Rebuild Help Index".');
            return;
        }
        const seed = getSelectedWord() || '';

        const cfg = vscode.workspace.getConfiguration('gap-help');
        const fromBegin = cfg.get<string>('searchMode') === 'prefix';

        const picked = await showLiveSearchPicker(seed,
            (topic, fb) => searchHelp(allEntries, topic, fb),
            fromBegin, bookDescriptions);
        if (picked) showHelpPanel(picked, gapRoot);
    }));

    // Open GAP Reference Manual 
    ctx.subscriptions.push(vscode.commands.registerCommand('gap-help.openReference', () => {
        if (!checkGapPath()) return;
        // Always open the non-MathJax page.
        // The _mj pages ship MathJax v2.
        // It would load a second copy alongside the v3 we inject.
        // It would also ignore the mathJax setting.
        // The extension handles math.
        const plain = path.join(gapRoot, 'doc', 'ref', 'chap0.html');
        const file = plain;
        if (!fs.existsSync(file)) {
            vscode.window.showWarningMessage('GAP Help: Reference manual not found in this installation.');
            return;
        }
        // Open via our webview
        showHelpPanel({
            filePath: file.substring(gapRoot.length).replace(/\\/g, '/'),
            anchor: '',
            display: 'Reference Manual',
            key: '',
            book: 'Reference',
            isTextOnly: false,
            chapter: 0,
            section: 0,
            type: '',
        }, gapRoot);
    }));

    // Manual Rebuild Index 
    ctx.subscriptions.push(vscode.commands.registerCommand('gap-help.rebuild', async () => {
        if (!checkGapPath()) return;
        const yes = await vscode.window.showInformationMessage(
            'GAP Help: Clear cached index and rebuild?', 'Rebuild');
        if (yes !== 'Rebuild') return;
        for (const f of ['export_gapdoc.txt', 'export_default.txt', 'export_text.txt', '.gap_root']) {
            try { fs.unlinkSync(path.join(dataDir, f)); } catch (_) { }
        }
        try {
            await doRebuild(ctx, dataDir, metaFile, gapRoot);
        } catch (e: any) {
            vscode.window.showErrorMessage(
                `GAP Help: Rebuild failed: ${e.message}`
            );
        }
    }));
}

/** Returns empty string on error. */
function safeRead(fp: string): string {
    try { return fs.readFileSync(fp, 'utf-8').trim(); } catch { return ''; }
}

/** Validate gapPath, return true if it points to a correct GAP root. */
function checkGapPath(): boolean {
    const cfg = vscode.workspace.getConfiguration('gap-help');
    const root = (cfg.get<string>('gapPath') || '').trim();
    if (isValidGapRoot(root)) {
        gapRoot = root;
        return true;
    }
    vscode.window.showWarningMessage(
        'GAP Help: Please set "gap-help.gapPath" to a valid GAP installation root (the folder containing doc/ and pkg/).',
        'Open Settings'
    ).then(action => {
        if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'gap-help.gapPath');
        }
    });
    return false;
}

/** Run convert_export.js */
function runConvertScript(scriptPath: string, cwd: string): void {
    const prev = process.cwd();
    process.chdir(cwd);
    try {
        const p = require.resolve(scriptPath);
        if (p in require.cache) delete require.cache[p];
        require(p);
    } finally {
        process.chdir(prev);
    }
}

/** Async exec with promise */
function execAsync(cmd: string, opts: { cwd: string; timeout?: number }): Promise<void> {
    return new Promise((resolve, reject) => {
        cp.exec(cmd, { ...opts, encoding: 'utf-8' }, (err) => {
            if (err) reject(err); else resolve();
        });
    });
}

// Utility functions

/** Check whether a path is a valid GAP installation root (contains doc/ and pkg/). */
function isValidGapRoot(p: string): boolean {
    return !!p && fs.existsSync(p)
        && fs.existsSync(path.join(p, 'doc'))
        && fs.existsSync(path.join(p, 'pkg'));
}

/** Compare two version strings. Returns positive if a is newer, negative if a is older, 0 if equal. */
function compareVersion(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] ?? 0;
        const nb = pb[i] ?? 0;
        if (na !== nb) return na - nb;
    }
    return 0;
}

/** Extract a GAP version string from a path (e.g. ".../gap-4.16.0" to "4.16.0"). */
function extractVersionFromPath(gapPath: string): string | null {
    const match = path.basename(gapPath).match(/(\d+\.\d+\.\d+)/);
    return match ? match[0] : null;
}

/** Scan the indexdata/ folder and return sorted version strings. */
function getBuiltinVersions(context: vscode.ExtensionContext): string[] {
    const root = path.join(context.extensionPath, 'indexdata');
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root)
        .filter(name => /^\d+\.\d+\.\d+$/.test(name) && fs.statSync(path.join(root, name)).isDirectory())
        .sort(compareVersion);
}

/**
 * Locate the gap executable.
 * Windows: checks PATH.
 * Linux/Mac: looks for <root>/gap, then <root>/bin/gap.sh, then PATH.
 */
function findGapBinary(gapRoot: string): string | null {
    if (process.platform === 'win32') {
        return gapInPath() ? 'gap' : null;
    }
    const direct = path.join(gapRoot, 'gap');
    if (fs.existsSync(direct)) return direct;
    const script = path.join(gapRoot, 'bin', 'gap.sh');
    if (fs.existsSync(script)) return script;
    return gapInPath() ? 'gap' : null;
}

/** Check that `gap` is runnable from PATH (Windows only). */
function gapInPath(): boolean {
    try {
        cp.execSync('gap --version', { encoding: 'utf-8', timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}

/** Get selected text under cursor. */
function getSelectedWord(): string | undefined {
    const ed = vscode.window.activeTextEditor;
    if (!ed) return;
    const sel = ed.selection;
    const range = sel.isEmpty ? ed.document.getWordRangeAtPosition(sel.start) : sel;
    return range ? ed.document.getText(range) : undefined;
}
