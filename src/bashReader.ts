import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MAX_BYTES = 512 * 1024;

export interface BashVar {
    name: string;
    value: string;    // empty string when dynamic === true
    dynamic: boolean;
    source: 'bash' | 'env';
    file: string;     // display name only — never logged as a value
}

const EXPORT_RE  = /^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
const ENV_RE     = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
const QUOTE_RE   = /^(['"])(.*)\1$/s;
const DYNAMIC_RE = /\$\(/;

function stripQuotes(val: string): string {
    const m = val.match(QUOTE_RE);
    return m ? m[2] : val;
}

function parseLines(
    lines: string[],
    pattern: RegExp,
    source: BashVar['source'],
    file: string
): BashVar[] {
    const results: BashVar[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) { continue; }
        const m = trimmed.match(pattern);
        if (!m) { continue; }
        const name = m[1];
        const raw = stripQuotes(m[2]);
        const dynamic = DYNAMIC_RE.test(raw);
        results.push({ name, value: dynamic ? '' : raw, dynamic, source, file });
    }
    return results;
}

function readLines(filePath: string): string[] | null {
    try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_BYTES) { return null; }
        return fs.readFileSync(filePath, 'utf8').split('\n');
    } catch {
        return null;
    }
}

export function readBashVars(): BashVar[] {
    const file = process.platform === 'darwin' ? '.bash_profile' : '.bashrc';
    const lines = readLines(path.join(os.homedir(), file));
    if (!lines) { return []; }
    return parseLines(lines, EXPORT_RE, 'bash', file);
}

export function readEnvFile(absPath: string, displayName: string): BashVar[] {
    const lines = readLines(absPath);
    if (!lines) { return []; }
    return parseLines(lines, ENV_RE, 'env', displayName);
}
