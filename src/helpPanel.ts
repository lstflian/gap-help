/**
 * Panel entry point.
 * Creates the webview panel.
 * Owns the module level session pointer.
 * Routes webview messages.
 * Message callbacks read the current session each time.
 * They never capture a local instance.
 * The dispose callback only resets its own instance.
 * An old panel cannot clear the state of a new panel.
 */

import * as vscode from 'vscode';
import { HelpEntry } from './indexData';
import { STYLES } from './webview/themes/registry';
import { getMathJax, setMathJax, getWebResourcesDir } from './styleState';
import { buildNavScript } from './webview/navScript';
import { navigatePage as navigateImpl, refreshCurrentPage as refreshImpl, renderStyleValue } from './webview/navigation';
import { HelpPanelSession } from './webview/panelState';

// The active session or null.
// This is the only module level state.
let session: HelpPanelSession | null = null;

/**
 * Re-render the current page when the MathJax setting changes.
 * It forwards to the current session.
 */
export function refreshCurrentPage(): void {
    if (session) refreshImpl(session);
}

/**
 * Open a webview panel and show a help entry.
 */
export function showHelpPanel(entry: HelpEntry, gapRoot: string): void {
    if (session) { session.panel.dispose(); session = null; }

    const panel = vscode.window.createWebviewPanel(
        'gapHelp', 'GAP Help',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
        {
            enableScripts: true, enableFindWidget: true,
            // The GAP root for the docs and our webresources for fallback styles.
            localResourceRoots: [
                vscode.Uri.file(gapRoot),
                ...(getWebResourcesDir() ? [vscode.Uri.file(getWebResourcesDir())] : []),
            ],
        }
    );
    session = new HelpPanelSession(panel, gapRoot);
    const thisSession = session;

    // Clear only this instance.
    // The old panel cannot touch the module pointer or a newer session.
    panel.onDidDispose(() => { thisSession.reset(); });

    // Handle nav messages from the webview.
    panel.webview.onDidReceiveMessage(msg => {
        // Read the current session each time.
        // Never capture a local instance.
        const s = session;
        if (!s) return;
        if (msg.type === 'nav') {
            navigateImpl(s, msg.file, msg.anchor, msg.style);
        } else if (msg.type === 'scrollY') {
            s.lastScrollY = msg.y;
        } else if (msg.type === 'mathjax') {
            // Save the scroll position, then flip the switch.
            // The setting change triggers a re-render.
            s.pendingScrollY = typeof msg.scrollY === 'number' ? msg.scrollY : undefined;
            setMathJax(msg.on);
        }
    });
    panel.title = entry.display;

    // For F entries with the default handler, scroll to the first matching code element.
    const placeholder = entry.anchor.startsWith('X') || entry.type !== 'F'
        ? entry.anchor
        : entry.anchor + '||' + entry.display;

    const navScript = buildNavScript(placeholder, '', getMathJax());

    const style = vscode.workspace.getConfiguration('gap-help').get<string>('helpStyle') ?? '';
    const mod = STYLES[style];
    if (!mod && style) {
        vscode.window.showWarningMessage(`GAP Help: Unknown help style "${style}", falling back to "native".`);
    }
    const active = mod ?? STYLES.native;
    let result: string | null = null;
    if (active) {
        result = active.renderEntry(entry, gapRoot, panel.webview.cspSource, navScript, (abs) => panel.webview.asWebviewUri(vscode.Uri.file(abs)).toString(), (file: string, docDir: string) => {
            session?.setFileState(file, docDir);
        }, renderStyleValue(), getMathJax());
    }
    if (result) panel.webview.html = result;
}


