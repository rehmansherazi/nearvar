import * as fs from 'fs';
import * as yaml from 'js-yaml';

const MAX_BYTES = 512 * 1024;

export interface RunbookEntry {
    path: string;
    recursive: boolean;
    exclude: string[];
}

export interface NearVarConfig {
    sources: {
        runbooks: RunbookEntry[];
        bash: boolean;
        env: string[];
        aws: boolean;
    };
    ui: {
        collapsed: string[];
    };
}

export type ConfigResult =
    | { ok: true; config: NearVarConfig }
    | { ok: false; error: string };

export function loadConfig(configPath: string): ConfigResult {
    let raw: string;
    try {
        const stat = fs.statSync(configPath);
        if (stat.size > MAX_BYTES) {
            return { ok: false, error: 'nearvar.yaml exceeds 512 KB — file skipped.' };
        }
        raw = fs.readFileSync(configPath, 'utf8');
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Could not read nearvar.yaml: ${msg}` };
    }

    let parsed: unknown;
    try {
        parsed = yaml.load(raw);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `YAML parse error: ${msg}` };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'nearvar.yaml must be a YAML mapping at the top level.' };
    }

    const obj = parsed as Record<string, unknown>;

    const src = obj.sources;
    if (src !== undefined && (!src || typeof src !== 'object' || Array.isArray(src))) {
        return { ok: false, error: "'sources' must be a YAML mapping." };
    }

    const s = (src ?? {}) as Record<string, unknown>;

    let collapsed: string[] = [];
    const rawUi = obj.ui;
    if (rawUi && typeof rawUi === 'object' && !Array.isArray(rawUi)) {
        const rawCollapsed = (rawUi as Record<string, unknown>).collapsed;
        if (Array.isArray(rawCollapsed)) {
            collapsed = toStringArray(rawCollapsed);
        }
    }

    const config: NearVarConfig = {
        sources: {
            runbooks: toRunbookArray(s.runbooks),
            bash: s.bash === true,
            env: toStringArray(s.env),
            aws: s.aws === true,
        },
        ui: { collapsed },
    };

    return { ok: true, config };
}

function toRunbookArray(val: unknown): RunbookEntry[] {
    if (!Array.isArray(val)) { return []; }
    return val.flatMap((entry): RunbookEntry[] => {
        if (typeof entry === 'string') {
            return [{ path: entry, recursive: true, exclude: [] }];
        }
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            const e = entry as Record<string, unknown>;
            if (typeof e['path'] !== 'string') {
                console.warn('NearVar: skipping runbook entry — missing or invalid path');
                return [];
            }
            return [{
                path: e['path'] as string,
                recursive: e['recursive'] !== false,
                exclude: toStringArray(e['exclude']),
            }];
        }
        console.warn('NearVar: skipping runbook entry — invalid type');
        return [];
    });
}

function toStringArray(val: unknown): string[] {
    if (!Array.isArray(val)) { return []; }
    return val.filter((x): x is string => typeof x === 'string');
}
