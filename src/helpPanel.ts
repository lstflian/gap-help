/**
 * This file does the following:
 * 
 * 1. Opens a webview panel in VS Code to show GAP help pages.
 * 2. Resolves file paths, converts to webview URLs, and handles link navigation.
 * 3. Leaves page rendering to theme modules in src/themes/registry.ts.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HelpEntry } from './indexData';
import { STYLES } from './themes/registry';

// Navigation script used in every webview page
const HELP_NAV_JS = (() => {
    try {
        return fs.readFileSync(path.join(__dirname, '..', 'webresources', 'help-nav.js'), 'utf-8');
    } catch {
        return '';
    }
})();

// Webview state

let panel: vscode.WebviewPanel | null = null;
let currentDocDir: string = '';
let currentFile: string = '';
let rootDir: string = '';

/** Turn a file path into a webview URL */
function resolveUri(abs: string): string {
    return panel!.webview.asWebviewUri(vscode.Uri.file(abs)).toString();
}

/** Open another HTML file or scroll to an anchor in the current one */
function navigatePage(navFile: string, anchor: string): void {
    if (!panel || !currentDocDir || !rootDir) return;

    let newFile = path.resolve(currentDocDir, navFile);
    if (!fs.existsSync(newFile)) {
        vscode.window.showWarningMessage(`GAP Help: File not found: ${newFile}`);
        return;
    }

    if (newFile === currentFile) {
        if (anchor) panel.webview.postMessage({ type: 'scroll', anchor, key: '' });
        return;
    }

    currentFile = newFile;
    currentDocDir = path.dirname(newFile);
    const navScript = `<script>${HELP_NAV_JS.replace('ANCHOR_PLACEHOLDER', anchor)}</script>`;

    const style = vscode.workspace.getConfiguration('gap-help').get<string>('helpStyle') ?? '';
    const mod = STYLES[style];
    let result: string | null = null;
    if (mod) {
        result = mod.renderFile(newFile, currentDocDir, rootDir, panel.webview.cspSource, navScript, resolveUri);
    }
    if (result) panel.webview.html = result;
    panel.title = path.basename(newFile).replace(/^chap/, 'Chapter ').replace('.html', '');
}

/**
 * Open a webview panel and show a help entry.
 */
export function showHelpPanel(entry: HelpEntry, gapRoot: string): void {
    if (panel) { panel.dispose(); panel = null; }

    rootDir = gapRoot;

    panel = vscode.window.createWebviewPanel(
        'gapHelp', 'GAP Help',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        { enableScripts: true, enableFindWidget: true, localResourceRoots: [vscode.Uri.file(gapRoot)] }
    );
    panel.onDidDispose(() => { panel = null; currentDocDir = ''; currentFile = ''; });
    // Handle nav messages from the webview
    panel.webview.onDidReceiveMessage(msg => {
        if (msg.type === 'nav') navigatePage(msg.file, msg.anchor);
    });
    panel.title = entry.display;

    // For entries where handler is default and entry[3] = F, scroll to the first matching <code> element.
    const placeholder = entry.anchor.startsWith('X') || entry.type !== 'F'
        ? entry.anchor
        : entry.anchor + '||' + entry.display;

    const navScript = `<script>${HELP_NAV_JS.replace('ANCHOR_PLACEHOLDER', placeholder)}</script>`;

    const style = vscode.workspace.getConfiguration('gap-help').get<string>('helpStyle') ?? '';
    const mod = STYLES[style];
    let result: string | null = null;
    if (mod) {
        result = mod.renderEntry(entry, gapRoot, panel.webview.cspSource, navScript, resolveUri, (file: string, docDir: string) => {
            currentFile = file;
            currentDocDir = docDir;
        });
    }
    if (result) panel.webview.html = result;
}


