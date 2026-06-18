"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readDocSources = readDocSources;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const MAX_BYTES = 512 * 1024;
const FENCE_OPEN = /^```bash\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const HEADING_RE = /^#{1,6}\s+(.+)$/;
function readRaw(filePath) {
    try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_BYTES) {
            return null;
        }
        return fs.readFileSync(filePath, 'utf8');
    }
    catch {
        return null;
    }
}
function extractBlocks(raw, relPath, absPath) {
    const text = raw.replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    let start = 0;
    if (lines[0] === '---') {
        let i = 1;
        while (i < lines.length && lines[i] !== '---') {
            i++;
        }
        start = i + 1;
    }
    const blocks = [];
    let currentHeading = '';
    let inBlock = false;
    let blockLines = [];
    for (let i = start; i < lines.length; i++) {
        const line = lines[i];
        if (!inBlock) {
            const hm = line.match(HEADING_RE);
            if (hm) {
                currentHeading = hm[1].trim();
                continue;
            }
            if (FENCE_OPEN.test(line)) {
                inBlock = true;
                blockLines = [];
                continue;
            }
        }
        else {
            if (FENCE_CLOSE.test(line)) {
                const nonEmpty = blockLines.filter(l => l.trim());
                if (nonEmpty.length > 0 && currentHeading) {
                    blocks.push({ label: currentHeading, lines: nonEmpty, relPath, absPath });
                }
                inBlock = false;
            }
            else {
                blockLines.push(line);
            }
        }
    }
    return blocks;
}
function hasFrontmatterFlag(raw) {
    const text = raw.replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    if (lines[0] !== '---') {
        return false;
    }
    let i = 1;
    while (i < lines.length && lines[i] !== '---') {
        i++;
    }
    const fmContent = lines.slice(1, i).join('\n');
    try {
        const fm = yaml.load(fmContent);
        return !!fm &&
            typeof fm === 'object' &&
            !Array.isArray(fm) &&
            fm['bashdock'] === true;
    }
    catch {
        return false;
    }
}
function findMdFiles(dir) {
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return results;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findMdFiles(full));
        }
        else if (entry.isFile() && entry.name.endsWith('.md')) {
            results.push(full);
        }
    }
    return results;
}
function indexFile(absFile, relPath) {
    const raw = readRaw(absFile);
    if (raw === null) {
        return [];
    }
    return extractBlocks(raw, relPath, absFile);
}
function indexFolder(absFolder) {
    const files = findMdFiles(absFolder);
    const blocks = [];
    for (const absFile of files) {
        const raw = readRaw(absFile);
        if (raw === null) {
            continue;
        }
        if (!hasFrontmatterFlag(raw)) {
            continue;
        }
        const relPath = path.relative(absFolder, absFile);
        blocks.push(...extractBlocks(raw, relPath, absFile));
    }
    return blocks;
}
function readDocSources(runbooks, workspaceRoot) {
    return runbooks.map(sourcePath => {
        const abs = path.isAbsolute(sourcePath)
            ? sourcePath
            : path.join(workspaceRoot, sourcePath);
        let stat;
        try {
            stat = fs.statSync(abs);
        }
        catch { /* not found */ }
        if (!stat) {
            return { sourcePath, blocks: [], error: `Not found: ${sourcePath}` };
        }
        if (stat.isDirectory()) {
            return { sourcePath, blocks: indexFolder(abs) };
        }
        else if (stat.isFile()) {
            return { sourcePath, blocks: indexFile(abs, path.basename(abs)) };
        }
        return { sourcePath, blocks: [], error: `Not a file or folder: ${sourcePath}` };
    });
}
//# sourceMappingURL=docReader.js.map