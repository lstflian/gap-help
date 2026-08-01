/**
 * Link parser tests.
 * They run the real compiled linkParser module.
 * No vscode dependency and no GAP installation needed.
 *
 * Usage: node test/linkParser.test.js   (run npm run compile first)
 */

const path = require('path');
const { check, section, summary } = require('./helpers');

const OUT = path.join(__dirname, '..', 'out');
const { parseHref, isMathJaxToggleLink } = require(path.join(OUT, 'webview', 'linkParser.js'));

section('1. parseHref');

const cases = [
    ['chap2.html#X8755A2C67B197C63', { filePart: 'chap2.html', anchor: 'X8755A2C67B197C63', style: '' }, 'plain anchor link'],
    ['chooser.html?BACK=vscode-webview:/index.html', { filePart: 'chooser.html', anchor: '', style: '' }, 'back query is not a style'],
    ['chap1.html?GAPDocStyle=dark,toggless', { filePart: 'chap1.html', anchor: '', style: 'dark,toggless' }, 'chooser apply link'],
    ['chap3.html?GAPDocStyle=times#X123', { filePart: 'chap3.html', anchor: 'X123', style: 'times' }, 'style with anchor'],
    ['../../doc/tut/chap1.html', { filePart: '../../doc/tut/chap1.html', anchor: '', style: '' }, 'relative path'],
    ['chap1.html#X?GAPDocStyle=dark', { filePart: 'chap1.html', anchor: 'X?GAPDocStyle=dark', style: '' }, 'hash before query'],
    ['chap2.html?GAPDocStyle=times%', { filePart: 'chap2.html', anchor: '', style: 'times%' }, 'bad percent sequence'],
];

for (const [href, expected, desc] of cases) {
    check(`parse [${desc}]`, expected, parseHref(href));
}

section('2. External links are ignored');

const external = [
    'https://www.gap-system.org/about/history/',
    'http://example.com/x',
    'HTTP://EXAMPLE.COM/x',
    'mailto:test@gap-system.org',
];

for (const href of external) {
    check(`external [${href}]`, null, parseHref(href));
}

section('3. isMathJaxToggleLink');

const mjCases = [
    ['chap1_mj.html', true, 'mj page'],
    ['chap1.html', false, 'plain page'],
    ['chap1_mj.html#X123', true, 'mj page with anchor'],
    ['CHAP001_mj.htm', true, 'mj htm page'],
    ['CHAP001.htm', false, 'plain htm page'],
    ['https://gap-system.org', false, 'external link'],
];

for (const [href, expected, desc] of mjCases) {
    check(`mj [${desc}]`, expected, isMathJaxToggleLink(href));
}

summary();
