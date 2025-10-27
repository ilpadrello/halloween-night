#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const chaptersDir = path.join(root, 'Chapters');
const outFile = path.join(root, 'chapters.md');

function isChapterFile(name) {
    const lower = name.toLowerCase();
    if (!lower.endsWith('.md')) return false;
    const base = path.basename(lower, '.md').trim();
    // skip the explicit '0 empty' helper file only
    if (base === '0 empty' || base === '0_empty' || base === '0') return false;
    return true;
}

function main() {
    if (!fs.existsSync(chaptersDir)) {
        console.error('Chapters directory not found:', chaptersDir);
        process.exit(1);
    }
    const files = fs.readdirSync(chaptersDir).filter(isChapterFile).sort();
    const parts = [];
    parts.push('# Combined Chapters\n');
    for (const f of files) {
        const fp = path.join(chaptersDir, f);
        const name = path.basename(f, '.md');
        try {
            const content = fs.readFileSync(fp, 'utf8');
            parts.push(`<!-- Source: ${name} -->\n\n`);
            parts.push(content.trim() + '\n\n');
        } catch (err) {
            console.error('Failed to read', fp, err.message);
        }
    }
    fs.writeFileSync(outFile, parts.join('\n'), 'utf8');
    console.log('Wrote', outFile, 'with', files.length, 'chapters.');
}

if (require.main === module) main();

module.exports = { main };
