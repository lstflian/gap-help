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
import {
    getDocAppearance, getDocStyles, getMathJax, setDocStyles, setMathJax, resolveAppearance,
    isVscodeThemeDark, getWebResourcesDir,
} from './styleState';

// Navigation script used in every webview page
const HELP_NAV_JS = (() => {
    try {
        return fs.readFileSync(path.join(__dirname, '..', 'webresources', 'help-nav.js'), 'utf-8');
    } catch (e: any) {
        console.warn(`GAP Help: Failed to load help-nav.js: ${e.message}`);
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

/** Build the navigation script with a safely escaped anchor string. */
function buildNavScript(anchor: string, extraHeadScript: string = '', mathJaxOn: boolean = true, scrollY?: number): string {
    // JSON.stringify escapes quotes/backslashes; the extra escape prevents
    // a display name containing "</script>" from breaking out of the tag
    // (case-insensitive for </SCRIPT> variants).
    const safe = JSON.stringify(anchor).replace(/<\//gi, '<\\/');
    const mj = mathJaxOn ? 'on' : 'off';
    // scrollY is a plain number (or 'undefined'): no injection risk.
    const sy = typeof scrollY === 'number' ? String(scrollY) : 'undefined';
    // Replace MATHJAX/SCROLLY first (their values never contain placeholder
    // literals), then ANCHOR last so anchor text that happens to contain a
    // placeholder literal cannot corrupt the others.
    const js = HELP_NAV_JS
        .replace('MATHJAX_PLACEHOLDER', mj)
        .replace('SCROLLY_PLACEHOLDER', sy)
        .replace('ANCHOR_PLACEHOLDER', safe);
    return `<script>${js}</script>` + extraHeadScript;
}

/** Escape a string for inline use in a <script> literal (JSON + </script> safe). */
function escapeInlineJs(s: string): string {
    return JSON.stringify(s).replace(/<\//gi, '<\\/');
}

/**
 * Extra head script for chooser.html.
 * Seeds the GAPDocStyle cookie, sets the radio states from our style value,
 * and overrides f and resetf to build the back link.
 */
function buildChooserShim(backTarget: string, styleValue: string): string {
    const safeBack = escapeInlineJs(backTarget);
    const safeStyle = escapeInlineJs(styleValue);
    return `<script>
(function(){
  try { document.cookie = "GAPDocStyle=" + ${safeStyle} + ";Path=/"; } catch(e) {}
  window.__GAP_HELP_BACK = ${safeBack};
  function applyStyle(style) {
    var a = document.getElementsByName("backLINK")[0];
    if (!a || !window.__GAP_HELP_BACK) return;
    // Keep the query even for "default" so the extension can clear the style state (applyStyleFromChooser handles 'default').
    a.href = window.__GAP_HELP_BACK + (style ? "?GAPDocStyle=" + style : "");
  }
  window.f = function() { try { applyStyle(window.getstyle()); } catch(e) {} };
  window.resetf = function() { applyStyle("default"); };
  document.addEventListener("DOMContentLoaded", function() {
    var want = (${safeStyle} || "").split(",");
    var chform = document.forms[0].elements;
    for (var i = 0; i < chform.length; i++) {
      if (chform[i].type === "radio") {
        chform[i].checked = want.indexOf(chform[i].value) > -1;
      }
    }
    // chooser.html calls initform and f before DOMContentLoaded, so the back link may already be built from the HTML default.
    // Rebuild it here.
    try { window.f(); } catch(e) {}

    // Reset restores the HTML default which conflicts with our system semantics. 
    // Intercept it, set all radios to their empty defaults, and rebuild the back link as default.
    var form = document.forms[0];
    if (form) {
      form.addEventListener("reset", function(ev) {
        ev.preventDefault();
        var els = form.elements;
        for (var j = 0; j < els.length; j++) {
          if (els[j].type === "radio") {
            els[j].checked = els[j].value === "";
          }
        }
        window.resetf();
      });
    }
  });
})();
</script>`;
}

/**
 * Parse a GAPDocStyle value from the chooser into settings and globalState.
 * Returns the resolved style value to render with immediately.
 * dark or light sets the appearance. default resets to system and clears the extras. 
 * A value without dark or light keeps the current appearance.
 * Other options go to globalState.
 */
function applyStyleFromChooser(styleValue: string): string {
    const parts = styleValue.split(',').map(s => s.trim()).filter(Boolean);
    let appearance = '';
    const extras: string[] = [];
    for (const p of parts) {
        if (p === 'dark' || p === 'light') appearance = p;
        else if (p !== 'default') extras.push(p);
    }
    const cfg = vscode.workspace.getConfiguration('gap-help');
    // Old-style choosers have no appearance radios and send styles without dark or light. 
    // Keep the current appearance then. 
    // Only default or an explicit dark or light changes it.
    const current = cfg.get<string>('docAppearance') || 'system';
    const nextAppearance = appearance
        ? appearance
        : parts.includes('default') ? 'system' : current;
    if (cfg.get<string>('docAppearance') !== nextAppearance) {
        void cfg.update('docAppearance', nextAppearance, vscode.ConfigurationTarget.Global);
    }
    setDocStyles(extras.join(','));
    // Resolve system against the theme. Do not read the config here because settings.update is async and would still return the old value.
    const resolved = nextAppearance === 'system'
        ? (isVscodeThemeDark() ? 'dark' : 'light')
        : nextAppearance;
    return [resolved, ...extras].join(',');
}

/** Full style value for rendering: system resolved against the theme. */
function renderStyleValue(): string {
    const parts = getDocStyles() ? getDocStyles().split(',').map(s => s.trim()).filter(Boolean) : [];
    parts.unshift(resolveAppearance());
    return parts.join(',');
}

/** Style value for the chooser form: reflects explicit settings only. */
function chooserStyleValue(): string {
    const raw = getDocAppearance();
    const parts = getDocStyles() ? getDocStyles().split(',').map(s => s.trim()).filter(Boolean) : [];
    if (raw === 'dark' || raw === 'light') parts.unshift(raw);
    return parts.join(',');
}

/** Open another HTML file or scroll to an anchor in the current one */
function navigatePage(navFile: string, anchor: string, docStyle?: string, forceRender: boolean = false, scrollY?: number): void {
    if (!panel || !currentDocDir || !rootDir) return;

    let styleValue = renderStyleValue();
    if (docStyle !== undefined && docStyle !== '') {
        styleValue = applyStyleFromChooser(docStyle);
    }

    // Support both relative links and root-absolute links like /pkg/...
    const newFile = navFile.startsWith('/')
        ? path.join(rootDir, navFile)
        : path.resolve(currentDocDir, navFile);
    if (!fs.existsSync(newFile)) {
        vscode.window.showWarningMessage(`GAP Help: File not found: ${newFile}`);
        return;
    }

    if (newFile === currentFile && !forceRender && docStyle === undefined) {
        if (anchor) panel.webview.postMessage({ type: 'scroll', anchor, key: '' });
        return;
    }

    // Navigating to a different page.
    if (newFile !== currentFile) lastScrollY = undefined;

    const isChooser = path.basename(newFile).toLowerCase() === 'chooser.html';
    const prevFile = currentFile;
    const prevDocDir = currentDocDir;
    currentFile = newFile;
    currentDocDir = path.dirname(newFile);

    let navScript: string;
    if (isChooser) {
        // back target = the page we came from, relative to the chooser dir
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
        result = mod.renderFile(newFile, currentDocDir, rootDir, panel.webview.cspSource, navScript, resolveUri, styleValue, getMathJax());
    }
    if (result) {
        panel.webview.html = result;
        panel.title = isChooser ? 'Style Chooser'
            : path.basename(newFile).replace(/^chap/, 'Chapter ').replace('.html', '');
    } else {
        // Render failed (F-3): roll back the state so stale scroll/anchor messages don't target a page that is no longer displayed.
        currentFile = prevFile;
        currentDocDir = prevDocDir;
    }
}

let lastScrollY: number | undefined;
/** Scroll position to restore on the next forced re-render. */
let pendingScrollY: number | undefined;

/** Re-render the current page (used when mathJax setting changes). */
export function refreshCurrentPage(): void {
    if (panel && currentFile) {
        const sy = pendingScrollY !== undefined ? pendingScrollY : lastScrollY;
        pendingScrollY = undefined;
        navigatePage(currentFile, '', undefined, true, sy);
    }
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
        {
            enableScripts: true, enableFindWidget: true,
            // gapRoot for the docs, plus our own webresources for the fallback appearance CSS and the dark code-block polish.
            localResourceRoots: [
                vscode.Uri.file(gapRoot),
                ...(getWebResourcesDir() ? [vscode.Uri.file(getWebResourcesDir())] : []),
            ],
        }
    );
    panel.onDidDispose(() => { panel = null; currentDocDir = ''; currentFile = ''; lastScrollY = undefined; pendingScrollY = undefined; });
    // Handle nav messages from the webview
    panel.webview.onDidReceiveMessage(msg => {
        if (msg.type === 'nav') {
            navigatePage(msg.file, msg.anchor, msg.style);
        } else if (msg.type === 'scrollY') {
            lastScrollY = msg.y;
        } else if (msg.type === 'mathjax') {
            // Save the scroll position for the re-render, then flip the switch. 
            // The config change listener in extension.ts re-renders.
            pendingScrollY = typeof msg.scrollY === 'number' ? msg.scrollY : undefined;
            setMathJax(msg.on);
        }
    });
    panel.title = entry.display;

    // For entries where handler is default and entry[3] = F, scroll to the first matching <code> element.
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
        result = active.renderEntry(entry, gapRoot, panel.webview.cspSource, navScript, resolveUri, (file: string, docDir: string) => {
            currentFile = file;
            currentDocDir = docDir;
        }, renderStyleValue(), getMathJax());
    }
    if (result) panel.webview.html = result;
}


