import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MAX_BYTES = 512 * 1024;

const SENSITIVE_PATTERNS = [
    'PASSWORD', 'PASSWD', 'PWD',
    'SECRET',
    'TOKEN',
    'KEY',
    'CREDENTIAL', 'CRED',
    'AUTH',
    'PRIVATE',
    'CERT',
    'LICENSE',
    'SIGNATURE',
    'DSN',
    'CONNECTION_STRING', 'CONN_STR',
    'P12', 'PFX', 'PEM',
];

// PASS matched only when preceded by _ or start-of-name, and followed by _ or end-of-name.
// Avoids false matches on BYPASS, COMPASS (contain PASS mid-word), PASSPHRASE, PASSPORT (no boundary after).
const PASS_RE = /(^|_)PASS(_|$)/;

const SENSITIVE_URL_PREFIXES = [
    'DB', 'DATABASE', 'MONGO', 'REDIS', 'MYSQL',
    'POSTGRES', 'POSTGRESQL', 'JDBC', 'CONNECTION',
    'MARIADB', 'MSSQL', 'ORACLE', 'ELASTICSEARCH',
];

const AUTH_SAFE_SUFFIXES = ['_TYPE', '_METHOD', '_SCHEME', '_MODE', '_STRATEGY'];

export function isSensitive(name: string): boolean {
    const upper = name.toUpperCase();
    for (const p of SENSITIVE_PATTERNS) {
        if (!upper.includes(p)) { continue; }
        if (p === 'AUTH' && AUTH_SAFE_SUFFIXES.some(s => upper.endsWith(s))) { continue; }
        return true;
    }
    if (PASS_RE.test(upper)) { return true; }
    if ((upper.includes('URL') || upper.includes('URI')) &&
        SENSITIVE_URL_PREFIXES.some(p => upper.includes(p))) {
        return true;
    }
    return false;
}

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
    const candidates = ['.bashrc', '.bash_profile', '.bash_login'];
    const seen = new Map<string, BashVar>();
    for (const file of candidates) {
        const lines = readLines(path.join(os.homedir(), file));
        if (!lines) { continue; }
        for (const v of parseLines(lines, EXPORT_RE, 'bash', file)) {
            seen.set(v.name, v); // later file wins on conflict
        }
    }
    return Array.from(seen.values());
}

export function readEnvFile(absPath: string, displayName: string): BashVar[] {
    const lines = readLines(absPath);
    if (!lines) { return []; }
    return parseLines(lines, ENV_RE, 'env', displayName);
}
