#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chaptersDir = path.join(root, 'Chapters');
const outDir = path.join(root, 'generated');
const outFile = path.join(outDir, 'generated_todos.md');

function isHeaderLine(line) {
    return /^\s{0,}#{1,6}\s+/.test(line);
}

function findSectionIndex(lines, titleRegex) {
    for (let i = 0; i < lines.length; i++) {
        if (titleRegex.test(lines[i].trim())) return i;
    }
    return -1;
}

function extractBlock(lines, startIndex) {
    // collect lines until next header or EOF
    const out = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
        if (isHeaderLine(lines[i])) break;
        out.push(lines[i]);
    }
    // trim leading/trailing empty lines
    while (out.length && out[0].trim() === '') out.shift();
    while (out.length && out[out.length - 1].trim() === '') out.pop();
    return out.join('\n');
}

function processFile(filePath) {
    const name = path.basename(filePath, '.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    // match TO DO / TODO / To Do (with optional leading # header)
    const todoRegex = /^(#{1,6}\s*)?(TO ?DO|TODO|To Do)\s*$/i;
    const idx = findSectionIndex(lines, todoRegex);
    if (idx === -1) return null;
    const block = extractBlock(lines, idx);
    return { source: name, block };
}

function main() {
    if (!fs.existsSync(chaptersDir)) {
        console.error('Chapters directory not found:', chaptersDir);
        process.exit(1);
    }
    const files = fs.readdirSync(chaptersDir).filter(f => f.toLowerCase().endsWith('.md'));
    const results = [];
    for (const f of files) {
        const fp = path.join(chaptersDir, f);
        try {
            const res = processFile(fp);
            if (res) results.push(res);
        } catch (err) {
            console.error('Error processing', f, err && err.message);
        }
    }

    let out = '# Generated TODOs (extracted from Chapters)\n\n';
    out += `> Generated on ${new Date().toISOString()} by scripts/todos.js\n\n`;
    if (!results.length) out += '_No TODO sections found in Chapters/_\n';
    else {
        for (const r of results) {
            out += `## ${r.source}\n\n`;
            out += r.block + '\n\n';
        }
    }

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, out, 'utf8');
    console.log('Wrote', outFile, 'with', results.length, 'entries from', files.length, 'files.');
}

if (require.main === module) main();

module.exports = { processFile };
