/**
 * This file does the following:
 * 
 * 1. Find GAP installation path.
 * 2. Rebuild index if GAP path changed or index is missing.
 * 3. Load index data into memory.
 * 4. Register commands:
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
import { showHelpPanel } from './helpPanel';

let allEntries: HelpEntry[] = [];
let bookDescriptions: Map<string, string> = new Map();
let gapRoot: string = '';

/**
 * Completes the four steps described in the file header above.
 */
export async function activate(context: vscode.ExtensionContext) {
    const dataDir = path.join(context.globalStorageUri.fsPath, 'data');
    if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
    const metaFile = path.join(dataDir, '.gap_root');
    const cleanFile = path.join(dataDir, 'export_gapdoc.txt');
    const defaultFile = path.join(dataDir, 'export_default.txt');
    const textFile = path.join(dataDir, 'export_text.txt');

    // Step 1. Find GAP installation path
    gapRoot = findGAPRoot();
    if (!gapRoot) {
        vscode.window.showWarningMessage(
            'GAP Help: Cannot find GAP installation. Please add GAP to your system PATH and restart VS Code.'
        );
        return;
    }

    // Step 2. Check if index data needs rebuilding
    const cached = safeRead(metaFile);
    const pathChanged = cached !== gapRoot;
    const dataMissing = !fs.existsSync(cleanFile) || !fs.existsSync(defaultFile) || !fs.existsSync(textFile);

    if (dataMissing) {
        try {
            await doRebuild(context, dataDir, metaFile, gapRoot);
        } catch (e: any) {
            vscode.window.showErrorMessage(
                `GAP Help: Index build failed — ${e.message}. Check that GAP is in your PATH.`
            );
            return;
        }
    } else if (pathChanged) {
        const action = await vscode.window.showInformationMessage(
            'GAP Help: GAP installation changed. Rebuild help index (~10s)?', 'Rebuild', 'Skip');
        if (action === 'Rebuild') {
            try {
                await doRebuild(context, dataDir, metaFile, gapRoot);
            } catch (e: any) {
                vscode.window.showErrorMessage(
                    `GAP Help: Rebuild failed — ${e.message}`
                );
            }
        }
    }

    // Step 3. Load index data into memory
    if (!allEntries.length) {
        const loaded = loadIndex(dataDir);
        allEntries = loaded.entries;
        bookDescriptions = loaded.bookDescriptions;
    }

    if (!allEntries.length) {
        vscode.window.showWarningMessage('GAP Help: Help index not found. Run "GAP: Rebuild Help Index" to generate it.');
    }

    // Step 4. Register commands
    registerCommands(context, dataDir, metaFile);
}

export function deactivate() {}

/**
 * Run GAP export scripts to generate help index, then load the result.
 */
async function doRebuild(context: vscode.ExtensionContext, dataDir: string, metaFile: string, gRoot: string) {
    const scripts = path.join(context.extensionPath, 'scripts');
    const exp = path.join(scripts, 'export.g');
    const expt = path.join(scripts, 'export_text.g');
    const conv = path.join(scripts, 'convert_export.js');
    if (!fs.existsSync(scripts) || !fs.existsSync(exp)) return;

    const done = vscode.window.setStatusBarMessage('$(sync~spin) GAP Help: building index…');
    await execAsync(`gap -q --nointeract "${exp}"`, { cwd: dataDir, timeout: 300000 });
    if (fs.existsSync(conv)) { runConvertScript(conv, dataDir); }
    if (fs.existsSync(expt)) { await execAsync(`gap -q --nointeract "${expt}"`, { cwd: dataDir, timeout: 60000 }); }
    done.dispose();

    const loaded = loadIndex(dataDir);
    allEntries = loaded.entries;
    bookDescriptions = loaded.bookDescriptions;
    fs.writeFileSync(metaFile, gRoot);
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
        const seed = getSelectedWord() || '';
        if (!allEntries.length) { vscode.window.showWarningMessage('GAP Help: Search unavailable — help index not loaded. Run "GAP: Rebuild Help Index" first.'); return; }

        const cfg = vscode.workspace.getConfiguration('gap-help');
        const fromBegin = cfg.get<string>('searchMode') === 'prefix';

        const picked = await showLiveSearchPicker(seed,
            (topic, fb) => searchHelp(allEntries, topic, fb),
            fromBegin, bookDescriptions);
        if (picked) showHelpPanel(picked, gapRoot);
    }));

    // Open GAP Reference Manual 
    ctx.subscriptions.push(vscode.commands.registerCommand('gap-help.openReference', () => {
        if (!gapRoot) { vscode.window.showWarningMessage('GAP Help: GAP not detected. Make sure GAP is in your system PATH.'); return; }
        const mj = path.join(gapRoot, 'doc', 'ref', 'chap0_mj.html');
        const plain = path.join(gapRoot, 'doc', 'ref', 'chap0.html');
        const file = fs.existsSync(mj) ? mj : plain;
        if (!fs.existsSync(file)) {
            vscode.window.showErrorMessage(`GAP Help: Reference manual not found — ${file}`);
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
        const yes = await vscode.window.showInformationMessage(
            'GAP Help: Clear cached index and rebuild?', 'Rebuild');
        if (yes !== 'Rebuild') return;
        for (const f of ['export_gapdoc.txt', 'export_default.txt', 'export_text.txt', '.gap_root']) {
            try { fs.unlinkSync(path.join(dataDir, f)); } catch (_) { }
        }
        try {
            await doRebuild(ctx, dataDir, metaFile, gapRoot || findGAPRoot());
        } catch (e: any) {
            vscode.window.showErrorMessage(
                `GAP Help: Rebuild failed — ${e.message}`
            );
        }
    }));
}

/** Returns empty string on error. */
function safeRead(fp: string): string {
    try { return fs.readFileSync(fp, 'utf-8').trim(); } catch { return ''; }
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

/**
 * Locate GAP installation by finding gap.exe in the system PATH.
 * Returns the GAP root path, or empty string if not found.
 */
function findGAPRoot(): string {
    try {
        const raw = cp.execSync('cmd /c where gap 2>nul', { encoding: 'utf-8', timeout: 5000 });
        const exe = raw.trim().split(/\r?\n/)[0]?.trim();
        if (exe) {
            const dir = path.dirname(exe);
            if (fs.existsSync(path.join(dir, 'doc')) && fs.existsSync(path.join(dir, 'pkg'))) return dir;
        }
    } catch (_) { }
    return '';
}

/** Get selected text under cursor. */
function getSelectedWord(): string | undefined {
    const ed = vscode.window.activeTextEditor;
    if (!ed) return;
    const sel = ed.selection;
    const range = sel.isEmpty ? ed.document.getWordRangeAtPosition(sel.start) : sel;
    return range ? ed.document.getText(range) : undefined;
}
