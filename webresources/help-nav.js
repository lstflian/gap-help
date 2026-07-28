/** Scroll to anchors and intercept internal links for webview navigation. */

var vsc = acquireVsCodeApi();

(function(a) {
    var findAnchor = function(anchor) {
        return document.getElementById(anchor)
            || document.querySelector('[name="' + CSS.escape(anchor) + '"]');
    };

    var flash = function(el) {
        el.style.transition = 'background 0.15s ease';
        el.style.background = 'var(--vscode-textLink-activeForeground, #e6b800)';
        setTimeout(function() { el.style.background = ''; }, 1000);
    };

    var scrollTo = function(anchor, key) {
        var el = findAnchor(anchor);
        if (!el) return;
        el.scrollIntoView({ block: 'start', behavior: 'instant' });

        if (key) {
            var visible = el.nextElementSibling
                || (el.parentElement && el.parentElement.nextElementSibling);
            var nearby = visible ? (visible.textContent || '') : '';
            if (nearby.indexOf(key) === -1) {
                var codes = document.querySelectorAll('code');
                for (var i = 0; i < codes.length; i++) {
                    if ((codes[i].textContent || '').indexOf(key) >= 0) {
                        codes[i].scrollIntoView({ block: 'start', behavior: 'instant' });
                        flash(codes[i]);
                        return;
                    }
                }
            }
        }

        var target = el.offsetHeight === 0
            ? (el.nextElementSibling || (el.parentElement && el.parentElement.nextElementSibling) || el)
            : el;
        flash(target);
    };

    document.addEventListener('DOMContentLoaded', function() {
        if (a) {
            var parts = a.split('||', 2);
            scrollTo(parts[0], parts.length > 1 ? parts[1] : '');
        }
    });

    window.addEventListener('message', function(ev) {
        if (ev.data.type === 'scroll') {
            scrollTo(ev.data.anchor, ev.data.key || '');
        }
    });

    document.addEventListener('click', function(ev) {
        var el = ev.target.closest('a');
        if (!el) return;
        var raw = el.getAttribute('href');
        if (!raw) return;
        if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('mailto:')) return;

        ev.preventDefault();

        // Send the raw path to navigatePage.
        var i = raw.indexOf('#');
        var f = i >= 0 ? raw.substring(0, i) : raw;
        var n = i >= 0 ? raw.substring(i + 1) : '';

        if (f) {
            vsc.postMessage({ type: 'nav', file: f, anchor: n });
        } else if (n) {
            var t = document.getElementById(n) || document.getElementsByName(n)[0];
            if (t) t.scrollIntoView();
        }
    });

})('ANCHOR_PLACEHOLDER');
