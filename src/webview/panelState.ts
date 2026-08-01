/**
 * HelpPanelSession holds the full state of one webview panel.
 * It is a plain state container with no logic.
 * Navigation and rendering live in navigation.ts and helpPanel.ts.
 * Each session keeps its own state.
 * The reset method only clears this instance.
 * Old panels cannot touch a newer session.
 * helpPanel.ts owns the module level session pointer.
 * Message callbacks read it each time.
 * They never capture a local instance.
 */

import * as vscode from 'vscode';

export class HelpPanelSession {
    /** The underlying webview panel. */
    readonly panel: vscode.WebviewPanel;
    /** The GAP install root. */
    readonly rootDir: string;

    /** The current HTML file with full path. */
    currentFile: string = '';
    /** The directory of the current file. */
    currentDocDir: string = '';

    /** The scroll position saved for re-renders. */
    lastScrollY: number | undefined;
    /** The exact scroll position saved when MathJax is toggled. */
    pendingScrollY: number | undefined;

    constructor(panel: vscode.WebviewPanel, rootDir: string) {
        this.panel = panel;
        this.rootDir = rootDir;
    }

    /** Record the file state after renderEntry finds the file. */
    setFileState(file: string, docDir: string): void {
        this.currentFile = file;
        this.currentDocDir = docDir;
    }

    /** Clear the scroll position on a cross page navigation. */
    markPageChanged(): void {
        this.lastScrollY = undefined;
    }

    /** Reset all state of this instance only. */
    reset(): void {
        this.currentFile = '';
        this.currentDocDir = '';
        this.lastScrollY = undefined;
        this.pendingScrollY = undefined;
    }
}
