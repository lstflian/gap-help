/**
 * Link parsing for help-nav.js navigation.
 * These functions mirror the click handler in help-nav.js.
 * Tests can run the same logic in plain Node.
 */

export interface ParsedHref {
    filePart: string;
    anchor: string;
    style: string;
}

/** Matches HTML links like chap1.html. */
const MJ_LINK_RE = /^([^?#]*?)(?:\.html?)(?:\?[^#]*)?(?:#[^?]*)?$/;

/**
 * Parse a link href the same way help-nav.js does.
 * Returns null for external links.
 * External links are not intercepted.
 */
export function parseHref(raw: string): ParsedHref | null {
    const lower = raw.toLowerCase();
    if (lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0 || lower.indexOf('mailto:') === 0) return null;

    // Split the anchor first, then the query.
    // A hash before a question mark must not break the parse.
    const h = raw.indexOf('#');
    const beforeHash = h >= 0 ? raw.substring(0, h) : raw;
    const anchor = h >= 0 ? raw.substring(h + 1) : '';
    const q = beforeHash.indexOf('?');
    const filePart = q >= 0 ? beforeHash.substring(0, q) : beforeHash;
    const query = q >= 0 ? beforeHash.substring(q + 1) : '';

    let style = '';
    if (query) {
        const m = query.match(/(?:^|&)GAPDocStyle=([^&]*)/);
        if (m) {
            try { style = decodeURIComponent(m[1]); }
            catch (e) { style = m[1]; }  // Bad percent sequence.
        }
    }
    return { filePart, anchor, style };
}

/** True if the href points to a MathJax toggle page. */
export function isMathJaxToggleLink(href: string): boolean {
    const m = MJ_LINK_RE.exec(href);
    return !!(m && /_mj$/.test(m[1]));
}
