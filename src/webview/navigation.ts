/**
 * Navigation and style logic.
 * The session is an explicit argument.
 * All state lives in the HelpPanelSession instance.
 * There is no module level mutable state.
 * This module owns navigation and the style values.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { STYLES } from './themes/registry';
import {
    getDocAppearance, getDocStyles, getMathJax, setDocStyles, resolveAppearance,
    isVscodeThemeDark,
} from '../styleState';
import { buildNavScript } from './navScript';
import { buildChooserShim, parseStyleValue, buildRenderStyleValue, buildChooserStyleValue } from './chooser';
import { HelpPanelSession } from './panelState';

/** Turn a file path into a webview URL. */
function resolveUri(s: HelpPanelSession, abs: string): string {
    return s.panel.webview.asWebviewUri(vscode.Uri.file(abs)).toString();
}

/**
 * Apply a chooser style value to settings and globalState.
 * Returns the style value to render with.
 * dark or light sets the appearance.
 * default resets to system and clears the extras.
 * A value without dark or light keeps the current appearance.
 * Other options go to globalState.
 */
function applyStyleFromChooser(styleValue: string): string {
    const { appearance, extras, hasDefault } = parseStyleValue(styleValue);
    const cfg = vscode.workspace.getConfiguration('gap-help');
    // Old choosers have no appearance radios.
    // They send styles without dark or light.
    // Keep the current appearance then.
    // Only default or an explicit dark or light changes it.
    const current = cfg.get<string>('docAppearance') || 'system';
    const nextAppearance = appearance
        ? appearance
        : hasDefault ? 'system' : current;
    if (cfg.get<string>('docAppearance') !== nextAppearance) {
        void cfg.update('docAppearance', nextAppearance, vscode.ConfigurationTarget.Global);
    }
    setDocStyles(extras.join(','));
    // Resolve system against the theme.
    // Do not read the config here because the update is async.
    // The old value would still be returned.
    const resolved = nextAppearance === 'system'
        ? (isVscodeThemeDark() ? 'dark' : 'light')
        : nextAppearance;
    return [resolved, ...extras].join(',');
}

/** The style value for rendering. */
export function renderStyleValue(): string {
    return buildRenderStyleValue(resolveAppearance(), getDocStyles());
}

/** The style value for the chooser form. */
function chooserStyleValue(): string {
    return buildChooserStyleValue(getDocAppearance(), getDocStyles());
}

/** Open another HTML file or scroll to an anchor in the current one. */
export function navigatePage(s: HelpPanelSession, navFile: string, anchor: string, docStyle?: string, forceRender: boolean = false, scrollY?: number): void {
    if (!s.panel || !s.currentDocDir || !s.rootDir) return;

    let styleValue = renderStyleValue();
    if (docStyle !== undefined && docStyle !== '') {
        styleValue = applyStyleFromChooser(docStyle);
    }

    // Support relative links and root relative links like /pkg/
    const newFile = navFile.startsWith('/')
        ? path.join(s.rootDir, navFile)
        : path.resolve(s.currentDocDir, navFile);
    if (!fs.existsSync(newFile)) {
        vscode.window.showWarningMessage(`GAP Help: File not found: ${newFile}`);
        return;
    }

    if (newFile === s.currentFile && !forceRender && docStyle === undefined) {
        if (anchor) s.panel.webview.postMessage({ type: 'scroll', anchor, key: '' });
        return;
    }

    // A new page clears the saved scroll position.
    if (newFile !== s.currentFile) s.markPageChanged();

    const isChooser = path.basename(newFile).toLowerCase() === 'chooser.html';
    const prevFile = s.currentFile;
    const prevDocDir = s.currentDocDir;
    s.currentFile = newFile;
    s.currentDocDir = path.dirname(newFile);

    let navScript: string;
    if (isChooser) {
        // The back target is the page we came from, relative to the chooser dir.
        const back = prevFile && prevFile !== newFile
            ? path.relative(path.dirname(newFile), prevFile).replace(/\\/g, '/')
            : '';
        navScript = buildNavScript(anchor, buildChooserShim(back, chooserStyleValue()), getMathJax());
    } else {
        navScript = buildNavScript(anchor, '', getMathJax(), scrollY);
    }

    const style = vscode.workspace.getConfiguration('gap-help').get<string>('helpStyle') ?? '';
    const mod = STYLES[style] ?? STYLES.native;
    let result: string | null = null;
    if (mod) {
        result = mod.renderFile(newFile, s.currentDocDir, s.rootDir, s.panel.webview.cspSource, navScript, (abs) => resolveUri(s, abs), styleValue, getMathJax());
    }
    if (result) {
        s.panel.webview.html = result;
        s.panel.title = isChooser ? 'Style Chooser'
            : path.basename(newFile).replace(/^chap/, 'Chapter ').replace('.html', '');
    } else {
        // Render failed.
        // Roll back the state so stale messages do not target the old page.
        s.currentFile = prevFile;
        s.currentDocDir = prevDocDir;
    }
}

/** Re-render the current page when the MathJax setting changes. */
export function refreshCurrentPage(s: HelpPanelSession): void {
    if (s.panel && s.currentFile) {
        const sy = s.pendingScrollY !== undefined ? s.pendingScrollY : s.lastScrollY;
        s.pendingScrollY = undefined;
        navigatePage(s, s.currentFile, '', undefined, true, sy);
    }
}
