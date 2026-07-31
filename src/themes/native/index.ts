/**
 * Native theme — matches GAP's original browser look.
 * Renders text-only, no-file, and HTML pages.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { HelpEntry } from '../../indexData';
import { buildCSP } from '../csp';



/** Supports $...$, $$...$$, \\(...\\), \\[...\\] */
const MATHJAX_SNIPPET = [
    '<script>',
    'MathJax={tex:{inlineMath:[["$","$"],["\\\\(","\\\\)"]],displayMath:[["$$","$$"],["\\\\[","\\\\]"]]}};',
    '<\/script>',
    '<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" async><\/script>'
].join('\n');

/** Base style for fallback pages, which have no manual.css. */
const FALLBACK_BODY_STYLE = [
    'body{',
    'font-family:Helvetica,Verdana,Arial,sans-serif;',
    'padding:20px;',
    'color:var(--vscode-editor-foreground);',
    'background:var(--vscode-editor-background)',
    '}',
].join('');

export const native = {
    STYLE_NAME: 'native' as const,

    /** Render a help entry (text-only, no-file, or HTML) */
    renderEntry(
        entry: HelpEntry,
        gapRoot: string,
        cspSource: string,
        navScript: string,
        toWebviewUri: (absPath: string) => string,
        setFileState: (file: string, docDir: string) => void
    ): string | null {
        // Text-only entry
        if (entry.isTextOnly && entry.textContent) {
            const clean = String(entry.textContent).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<!DOCTYPE html><html><head>`
                + `<meta http-equiv="Content-Security-Policy" content="${buildCSP('')}">`
                + `<style>${FALLBACK_BODY_STYLE}body{white-space:pre-wrap}</style>`
                + `${MATHJAX_SNIPPET}`
                + `</head><body>${clean}</body></html>`;
        }

        // Entry without a file
        if (!entry.filePath) {
            return `<!DOCTYPE html><html><head>`
                + `<meta http-equiv="Content-Security-Policy" content="${buildCSP('')}">`
                + `<style>${FALLBACK_BODY_STYLE}</style>`
                + `${MATHJAX_SNIPPET}`
                + `</head><body><p>No documentation available.</p></body></html>`;
        }

        // HTML doc
        const file = path.join(gapRoot, entry.filePath.replace(/#.*/, ''));
        if (!fs.existsSync(file)) {
            vscode.window.showErrorMessage(`GAP Help: File not found: ${file}`);
            return null;
        }
        const docDir = path.dirname(file);
        setFileState(file, docDir);
        return processHtmlFile(file, docDir, cspSource, navScript, toWebviewUri);
    },

    /** Render an HTML file for navigation */
    renderFile(
        filePath: string,
        docDir: string,
        gapRoot: string,
        cspSource: string,
        navScript: string,
        toWebviewUri: (absPath: string) => string
    ): string | null {
        return processHtmlFile(filePath, docDir, cspSource, navScript, toWebviewUri);
    },
};

// Internal helpers

const RES_DIR = path.join(__dirname, '..', '..', '..', 'webresources', 'native');
const HELP_SUPPLEMENT_CSS = readFile('help-supplement.css');

function readFile(name: string): string {
    try {
        return fs.readFileSync(path.join(RES_DIR, name), 'utf-8');
    } catch (e: any) {
        console.warn(`GAP Help: Failed to load ${name}: ${e.message}`);
        return '';
    }
}

function buildStyleTags(html: string): { tags: string; hasManualCSS: boolean } {
    const hasManualCSS = /<link[^>]+manual\.css/i.test(html);
    let tags = '';
    if (hasManualCSS) {
        // Fix VS Code injected code background for GAP native docs
        tags = `<style>code,tt{background:transparent!important}</style>`;
    } else {
        // Use our supplement CSS for docs without manual.css
        tags = `<style>${HELP_SUPPLEMENT_CSS}</style>`;
    }
    return { tags, hasManualCSS };
}

function processHtmlFile(
    filePath: string,
    docDir: string,
    cspSource: string,
    navScript: string,
    toWebviewUri: (absPath: string) => string
): string | null {
    try {
        let html = fs.readFileSync(filePath, 'utf-8');

        const resolveLink = (rel: string) => {
            const abs = path.resolve(docDir, rel);
            return toWebviewUri(abs);
        };

        html = html.replace(/\bsrc="(?!https?:\/\/)([^"]+)"/gi, (_, rel) => {
            return `src="${resolveLink(rel)}"`;
        });
        html = html.replace(/\bsrc='(?!https?:\/\/)([^']+)'/gi, (_, rel) => {
            return `src='${resolveLink(rel)}'`;
        });
        html = html.replace(/(<link\b[^>]*?\bhref)="(?!https?:\/\/|mailto:)([^"]+)"/gi, (_, prefix, rel) => {
            return `${prefix}="${resolveLink(rel)}"`;
        });
        const csp = buildCSP(cspSource);
        const parts = [`<meta http-equiv="Content-Security-Policy" content="${csp}">`];
        const { tags: styleTags, hasManualCSS: hasMC } = buildStyleTags(html);
        const extra = hasMC ? styleTags : styleTags + `\n${MATHJAX_SNIPPET}`;
        parts.push(extra, navScript, '</head>');
        return html.replace('</head>', parts.join('\n'));
    } catch (e: any) {
        vscode.window.showErrorMessage(`GAP Help: ${e.message}`);
        return null;
    }
}
