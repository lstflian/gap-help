/**
 * Navigation script injection.
 * Builds the script block added to every page.
 * The script file is webresources/help-nav.js.
 * It has three placeholders that are replaced here.
 * MATHJAX_PLACEHOLDER is the MathJax state.
 * SCROLLY_PLACEHOLDER is the scroll offset to restore.
 * ANCHOR_PLACEHOLDER is the anchor to scroll to.
 */

import * as fs from 'fs';
import * as path from 'path';

// The script used in every webview page.
const HELP_NAV_JS = (() => {
    try {
        return fs.readFileSync(path.join(__dirname, '..', '..', 'webresources', 'help-nav.js'), 'utf-8');
    } catch (e: any) {
        console.warn(`GAP Help: Failed to load help-nav.js: ${e.message}`);
        return '';
    }
})();

/** Escape a string for inline use in a script tag. */
export function escapeInlineJs(s: string): string {
    return JSON.stringify(s).replace(/<\//gi, '<\\/');
}

/** Build the navigation script with an escaped anchor string. */
export function buildNavScript(anchor: string, extraHeadScript: string = '', mathJaxOn: boolean = true, scrollY?: number): string {
    // JSON.stringify escapes quotes and backslashes.
    // The extra escape stops a display name from closing the script tag.
    const safe = escapeInlineJs(anchor);
    const mj = mathJaxOn ? 'on' : 'off';
    // scrollY is a plain number or undefined.
    // There is no injection risk.
    const sy = typeof scrollY === 'number' ? String(scrollY) : 'undefined';
    // Replace MATHJAX and SCROLLY first.
    // Their values never contain placeholder literals.
    // Replace ANCHOR last.
    // Anchor text with a placeholder literal cannot break the others.
    const js = HELP_NAV_JS
        .replace('MATHJAX_PLACEHOLDER', mj)
        .replace('SCROLLY_PLACEHOLDER', sy)
        .replace('ANCHOR_PLACEHOLDER', safe);
    return `<script>${js}</script>` + extraHeadScript;
}
