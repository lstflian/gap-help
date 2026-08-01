/**
 * Run all test files and print one combined report.
 * Each file runs in its own child process.
 * Failures are reported with their file and section.
 *
 * Usage: node test/run-all.js   (run npm run compile first)
 */

const { execFileSync } = require('child_process');
const path = require('path');

const FILES = ['search.test.js', 'linkParser.test.js', 'chooser.test.js'];

const results = [];
let totalPassed = 0;
let totalFailed = 0;
const allFailures = [];

for (const file of FILES) {
    const filePath = path.join(__dirname, file);
    let stdout = '';
    let exitCode = 0;
    try {
        stdout = execFileSync(process.execPath, [filePath], { encoding: 'utf-8' });
    } catch (e) {
        stdout = e.stdout || '';
        exitCode = e.status !== undefined ? e.status : 1;
    }

    // Parse the summary line like "18 passed, 0 failed".
    const m = stdout.match(/(\d+) passed, (\d+) failed/);
    const passed = m ? parseInt(m[1], 10) : 0;
    const failed = m ? parseInt(m[2], 10) : (exitCode === 0 ? 0 : 1);

    results.push({ file, passed, failed, exitCode, stdout });
    totalPassed += passed;
    totalFailed += failed;

    // Collect failure lines with their sections.
    const sectionRe = /=== (.+?) ===/g;
    const failRe = /^\s*FAIL\s+(.+)$/gm;
    let sec = '';
    let secMatch;
    while ((secMatch = sectionRe.exec(stdout)) !== null) {
        sec = secMatch[1];
    }
    let failMatch;
    while ((failMatch = failRe.exec(stdout)) !== null) {
        allFailures.push({ file, section: sec, name: failMatch[1] });
    }
}

// Report
console.log('\n=== TEST REPORT ===');
for (const r of results) {
    const mark = r.failed > 0 ? 'FAIL' : (r.exitCode === 0 ? 'ok' : 'ERR');
    console.log(`  ${mark.padEnd(4)} ${r.file.padEnd(20)} ${r.passed} passed, ${r.failed} failed`);
}
console.log('  ----');
console.log(`  TOTAL              ${totalPassed} passed, ${totalFailed} failed`);

if (allFailures.length) {
    console.log('\nFailures:');
    for (const f of allFailures) {
        console.log(`  - [${f.file}] [${f.section}] ${f.name}`);
    }
    // Print the detailed expected/actual block for each failing file.
    console.log('\nDetails:');
    for (const r of results) {
        if (r.failed > 0) {
            console.log(`\n--- ${r.file} ---`);
            const detailLines = r.stdout.split('\n').filter(l => /FAIL|expected:|actual:|section:/.test(l));
            console.log(detailLines.join('\n'));
        }
    }
    process.exitCode = 1;
} else {
    console.log('\nAll passed');
}
