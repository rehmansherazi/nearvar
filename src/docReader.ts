import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const MAX_BYTES = 512 * 1024;

const FENCE_OPEN  = /^```bash\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const HEADING_RE  = /^#{1,6}\s+(.+)$/;

export interface DocBlock {
    label: string;
    lines: string[];
    relPath: string;
    absPath: string;
}

export interface SourceResult {
    sourcePath: string;
    blocks: DocBlock[];
    error?: string;
}

function readRaw(filePath: string): string | null {
    try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_BYTES) { return null; }
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return null;
    }
}

function extractBlocks(raw: string, relPath: string, absPath: string): DocBlock[] {
    const text = raw.replace(/\r\n/g, '\n');
    const lines = text.split('\n');

    let start = 0;
    if (lines[0] === '---') {
        let i = 1;
        while (i < lines.length && lines[i] !== '---') { i++; }
        start = i + 1;
    }

    const blocks: DocBlock[] = [];
    let currentHeading = '';
    let inBlock = false;
    let blockLines: string[] = [];

    for (let i = start; i < lines.length; i++) {
        const line = lines[i];
        if (!inBlock) {
            const hm = line.match(HEADING_RE);
            if (hm) { currentHeading = hm[1].trim(); continue; }
            if (FENCE_OPEN.test(line)) { inBlock = true; blockLines = []; continue; }
        } else {
            if (FENCE_CLOSE.test(line)) {
                const nonEmpty = blockLines.filter(l => l.trim());
                if (nonEmpty.length > 0 && currentHeading) {
                    blocks.push({ label: currentHeading, lines: nonEmpty, relPath, absPath });
                }
                inBlock = false;
            } else {
                blockLines.push(line);
            }
        }
    }
    return blocks;
}

function hasFrontmatterFlag(raw: string): boolean {
    const text = raw.replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    if (lines[0] !== '---') { return false; }
    let i = 1;
    while (i < lines.length && lines[i] !== '---') { i++; }
    const fmContent = lines.slice(1, i).join('\n');
    try {
        const fm = yaml.load(fmContent);
        return !!fm &&
            typeof fm === 'object' &&
            !Array.isArray(fm) &&
            (fm as Record<string, unknown>)['bashdock'] === true;
    } catch {
        return false;
    }
}

function findMdFiles(dir: string): string[] {
    const results: string[] = [];
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findMdFiles(full));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            results.push(full);
        }
    }
    return results;
}

function indexFile(absFile: string, relPath: string): DocBlock[] {
    const raw = readRaw(absFile);
    if (raw === null) { return []; }
    return extractBlocks(raw, relPath, absFile);
}

function indexFolder(absFolder: string): DocBlock[] {
    const files = findMdFiles(absFolder);
    const blocks: DocBlock[] = [];
    for (const absFile of files) {
        const raw = readRaw(absFile);
        if (raw === null) { continue; }
        if (!hasFrontmatterFlag(raw)) { continue; }
        const relPath = path.relative(absFolder, absFile);
        blocks.push(...extractBlocks(raw, relPath, absFile));
    }
    return blocks;
}

export function readDocSources(runbooks: string[], workspaceRoot: string): SourceResult[] {
    return runbooks.map(sourcePath => {
        const abs = path.isAbsolute(sourcePath)
            ? sourcePath
            : path.join(workspaceRoot, sourcePath);

        let stat: fs.Stats | undefined;
        try { stat = fs.statSync(abs); } catch { /* not found */ }
        if (!stat) {
            return { sourcePath, blocks: [], error: `Not found: ${sourcePath}` };
        }

        if (stat.isDirectory()) {
            return { sourcePath, blocks: indexFolder(abs) };
        } else if (stat.isFile()) {
            return { sourcePath, blocks: indexFile(abs, path.basename(abs)) };
        }

        return { sourcePath, blocks: [], error: `Not a file or folder: ${sourcePath}` };
    });
}
