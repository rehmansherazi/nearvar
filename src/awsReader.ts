import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MAX_BYTES = 512 * 1024;

const SECTION_RE = /^\[(.+)\]$/;
const KV_RE      = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/;

export interface AwsProfile {
    name: string;
    region: string;
}

interface IniSection {
    name: string;
    keys: Record<string, string>;
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

function parseIni(raw: string): IniSection[] {
    const sections: IniSection[] = [];
    let current: IniSection | null = null;
    for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) { continue; }
        const sm = trimmed.match(SECTION_RE);
        if (sm) { current = { name: sm[1], keys: {} }; sections.push(current); continue; }
        const km = trimmed.match(KV_RE);
        if (km && current) { current.keys[km[1]] = km[2].trim(); }
    }
    return sections;
}

function parseConfig(raw: string): AwsProfile[] {
    return parseIni(raw).map(s => ({
        name: s.name === 'default' ? 'default' : s.name.replace(/^profile\s+/, ''),
        region: s.keys['region'] ?? '',
    }));
}

function parseCredentialNames(raw: string): string[] {
    return parseIni(raw).map(s => s.name);
}

export function readAwsProfiles(): AwsProfile[] {
    const awsDir = path.join(os.homedir(), '.aws');
    const configRaw = readRaw(path.join(awsDir, 'config'));
    const credsRaw  = readRaw(path.join(awsDir, 'credentials'));

    const profileMap = new Map<string, AwsProfile>();

    if (configRaw) {
        for (const p of parseConfig(configRaw)) {
            profileMap.set(p.name, p);
        }
    }

    if (credsRaw) {
        for (const name of parseCredentialNames(credsRaw)) {
            if (!profileMap.has(name)) {
                profileMap.set(name, { name, region: '' });
            }
        }
    }

    return Array.from(profileMap.values());
}
