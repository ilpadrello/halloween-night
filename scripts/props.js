#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chaptersDir = path.join(root, 'Chapters');
const outDir = path.join(root, 'generated');
const outFile = path.join(outDir, 'generated_props.md');

function isHeaderLine(line) {
    return /^\s{0,}#{1,6}\s+/.test(line);
}

function findPropsSection(lines) {
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (/^(#{1,6}\s*)?Props\s*$/i.test(t) || /^Props\s*$/i.test(t)) return i;
    }
    return -1;
}

function extractTablesFromBlock(lines, startIndex, endIndex) {
    const tables = [];
    let i = startIndex;
    while (i <= endIndex - 2) {
        // look for a header row followed by a separator row
        if (lines[i].includes('|') && /-{2,}/.test(lines[i + 1])) {
            // collect contiguous table lines
            const tableLines = [];
            let j = i;
            while (j <= endIndex && lines[j].trim() !== '' && (lines[j].includes('|') || /^[:\-\s|]+$/.test(lines[j]))) {
                tableLines.push(lines[j]);
                j++;
            }
            // trim trailing empty lines
            while (tableLines.length && tableLines[tableLines.length - 1].trim() === '') tableLines.pop();
            if (tableLines.length) tables.push(tableLines.join('\n'));
            i = j;
        } else {
            i++;
        }
    }
    return tables;
}

function processFile(filePath) {
    const name = path.basename(filePath, '.md');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    const propsIndex = findPropsSection(lines);
    if (propsIndex === -1) return [];

    // find end of props section (next header or EOF)
    let end = lines.length - 1;
    for (let k = propsIndex + 1; k < lines.length; k++) {
        if (isHeaderLine(lines[k])) { end = k - 1; break; }
    }

    const tables = extractTablesFromBlock(lines, propsIndex + 1, end);
    // return array of { source, table }
    return tables.map(t => ({ source: name.toLowerCase(), table: t }));
}

function main() {
    if (!fs.existsSync(chaptersDir)) {
        console.error('Chapters directory not found:', chaptersDir);
        process.exit(1);
    }
    const files = fs.readdirSync(chaptersDir).filter(f => f.toLowerCase().endsWith('.md'));
    const all = [];
    for (const f of files) {
        const fp = path.join(chaptersDir, f);
        try {
            const res = processFile(fp);
            if (res.length) all.push(...res);
        } catch (err) {
            console.error('Error processing', f, err.message);
        }
    }

    // prepare output
    const header = '# Generated props (tables extracted from Chapters)\n\n';
    const meta = `> Generated on ${new Date().toISOString()} by scripts/props.js\n\n`;

    let out = header + meta;
    if (!all.length) out += '_No props tables found in Chapters/_\n';
    else {
        for (const item of all) {
            out += `## ${item.source}\n\n`;
            out += item.table + '\n\n';
        }
    }

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, out, 'utf8');
    console.log('Wrote', outFile, 'with', all.length, 'tables from', files.length, 'files.');
}

if (require.main === module) main();

module.exports = { processFile, extractTablesFromBlock };
