import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { RunbookEntry } from './configReader';

const MAX_BYTES = 512 * 1024;

const FENCE_OPEN  = /^```(bash|sh|shell|zsh)\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const HEADING_RE  = /^#{1,6}\s+(.+)$/;

export interface DocBlock {
    label: string;
    lines: string[];
    relPath: string;
    absPath: string;
    fenceLine: number;
}

export interface SourceResult {
    sourcePath: string;
    blocks: DocBlock[];
    error?: string;
}

export function isRemoteUrl(source: string): boolean {
    return source.startsWith('https://');
}

export function fetchRemoteRunbook(urlStr: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(urlStr);
        } catch {
            reject(new Error('Invalid URL'));
            return;
        }

        if (parsedUrl.protocol !== 'https:') {
            reject(new Error('Only https:// URLs are accepted'));
            return;
        }

        if (parsedUrl.hostname !== 'raw.githubusercontent.com') {
            reject(new Error('Only raw.githubusercontent.com URLs are supported'));
            return;
        }

        let settled = false;
        let timedOut = false;

        const timer = setTimeout(() => {
            timedOut = true;
            req.destroy();
        }, 10000);

        const req = https.get(urlStr, res => {
            clearTimeout(timer);
            if (settled) { return; }

            if (res.statusCode !== 200) {
                settled = true;
                res.resume();
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            let data = '';
            let size = 0;
            res.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > MAX_BYTES) {
                    req.destroy();
                    if (!settled) { settled = true; reject(new Error('Response exceeds 512 KB')); }
                    return;
                }
                data += chunk.toString('utf8');
            });
            res.on('end', () => {
                if (!settled) { settled = true; resolve(data); }
            });
        });

        req.on('error', err => {
            clearTimeout(timer);
            if (!settled) {
                settled = true;
                reject(timedOut ? new Error('Request timed out') : err);
            }
        });
    });
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

export function parseBlocks(raw: string, relPath: string, absPath: string): DocBlock[] {
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
    let fenceLine = 0;

    for (let i = start; i < lines.length; i++) {
        const line = lines[i];
        if (!inBlock) {
            const hm = line.match(HEADING_RE);
            if (hm) { currentHeading = hm[1].trim(); continue; }
            if (FENCE_OPEN.test(line)) { inBlock = true; blockLines = []; fenceLine = i; continue; }
        } else {
            if (FENCE_CLOSE.test(line)) {
                const nonEmpty = blockLines.filter(l => l.trim());
                if (nonEmpty.length > 0 && currentHeading) {
                    blocks.push({ label: currentHeading, lines: nonEmpty, relPath, absPath, fenceLine });
                }
                inBlock = false;
            } else {
                blockLines.push(line);
            }
        }
    }
    return blocks;
}

function isExcluded(relPath: string, exclude: string[]): boolean {
    return exclude.some(pattern => minimatch(relPath, pattern));
}

function findMdFiles(dir: string, recursive: boolean): string[] {
    const results: string[] = [];
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (recursive && entry.isDirectory()) {
            results.push(...findMdFiles(full, recursive));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            results.push(full);
        }
    }
    return results;
}

function indexFile(absFile: string, relPath: string): DocBlock[] {
    const raw = readRaw(absFile);
    if (raw === null) { return []; }
    return parseBlocks(raw, relPath, absFile);
}

function indexFolder(absFolder: string, recursive: boolean, exclude: string[]): DocBlock[] {
    const files = findMdFiles(absFolder, recursive);
    const blocks: DocBlock[] = [];
    for (const absFile of files) {
        const relPath = path.relative(absFolder, absFile);
        if (isExcluded(relPath, exclude)) { continue; }
        const raw = readRaw(absFile);
        if (raw === null) { continue; }
        blocks.push(...parseBlocks(raw, relPath, absFile));
    }
    return blocks;
}

export async function readDocSources(runbooks: RunbookEntry[], workspaceRoot: string): Promise<SourceResult[]> {
    const results: SourceResult[] = [];

    for (const entry of runbooks) {
        const sourcePath = entry.path;

        if (sourcePath.startsWith('http://')) {
            results.push({ sourcePath, blocks: [], error: 'only https:// URLs are accepted' });
            continue;
        }

        if (isRemoteUrl(sourcePath)) {
            try {
                const raw = await fetchRemoteRunbook(sourcePath);
                const fileName = path.basename(sourcePath) || sourcePath;
                const blocks = parseBlocks(raw, fileName, sourcePath);
                results.push({ sourcePath, blocks });
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                let errorText: string;
                if (msg === 'Request timed out') {
                    errorText = 'request timed out';
                } else if (msg.startsWith('HTTP ')) {
                    const code = msg.slice(5);
                    errorText = code === '404' ? 'not found (404)' : `HTTP error (${code})`;
                } else if (msg.includes('Only raw.githubusercontent.com')) {
                    errorText = 'URL not supported — use raw.githubusercontent.com';
                } else {
                    errorText = 'could not fetch (network error)';
                }
                results.push({ sourcePath, blocks: [], error: errorText });
            }
            continue;
        }

        const abs = path.isAbsolute(sourcePath)
            ? sourcePath
            : path.join(workspaceRoot, sourcePath);

        let stat: fs.Stats | undefined;
        try { stat = fs.statSync(abs); } catch { /* not found */ }
        if (!stat) {
            results.push({ sourcePath, blocks: [], error: `Not found: ${sourcePath}` });
            continue;
        }

        if (stat.isDirectory()) {
            results.push({ sourcePath, blocks: indexFolder(abs, entry.recursive, entry.exclude) });
        } else if (stat.isFile()) {
            results.push({ sourcePath, blocks: indexFile(abs, path.basename(abs)) });
        } else {
            results.push({ sourcePath, blocks: [], error: `Not a file or folder: ${sourcePath}` });
        }
    }

    return results;
}
