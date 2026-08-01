/**
 * Style chooser logic.
 * Pure functions with no vscode dependency.
 * Tests can run them in plain Node.
 * The stateful parts stay in navigation.ts and styleState.ts.
 * This module computes values and builds the chooser shim script.
 */

import { escapeInlineJs } from './navScript';

export interface ParsedStyleValue {
    /** The dark or light value if chosen, empty otherwise. */
    appearance: string;
    /** The extra GAPDoc style options in order. */
    extras: string[];
    /** True when the value contains default. */
    hasDefault: boolean;
}

/** Split a chooser style value into appearance and extras. */
export function parseStyleValue(styleValue: string): ParsedStyleValue {
    const parts = styleValue.split(',').map(s => s.trim()).filter(Boolean);
    let appearance = '';
    const extras: string[] = [];
    for (const p of parts) {
        if (p === 'dark' || p === 'light') appearance = p;
        else if (p !== 'default') extras.push(p);
    }
    return { appearance, extras, hasDefault: parts.includes('default') };
}

/** Build the render value with resolved appearance and extras. */
export function buildRenderStyleValue(appearance: string, extraStyles: string): string {
    const parts = extraStyles ? extraStyles.split(',').map(s => s.trim()).filter(Boolean) : [];
    parts.unshift(appearance);
    return parts.join(',');
}

/** Build the chooser value with explicit settings only. */
export function buildChooserStyleValue(appearance: string, extraStyles: string): string {
    const parts = extraStyles ? extraStyles.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (appearance === 'dark' || appearance === 'light') parts.unshift(appearance);
    return parts.join(',');
}

/**
 * Build the extra head script for chooser.html.
 * It seeds the GAPDocStyle cookie.
 * It sets the radio states from our style value.
 * It overrides f and resetf to build the back link.
 */
export function buildChooserShim(backTarget: string, styleValue: string): string {
    const safeBack = escapeInlineJs(backTarget);
    const safeStyle = escapeInlineJs(styleValue);
    return `<script>
(function(){
  try { document.cookie = "GAPDocStyle=" + ${safeStyle} + ";Path=/"; } catch(e) {}
  window.__GAP_HELP_BACK = ${safeBack};
  function applyStyle(style) {
    var a = document.getElementsByName("backLINK")[0];
    if (!a || !window.__GAP_HELP_BACK) return;
    // Keep the query even for default so the extension can clear the style state.
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
