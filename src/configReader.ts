import * as fs from 'fs';
import * as yaml from 'js-yaml';

const MAX_BYTES = 512 * 1024;

export interface NearVarConfig {
    sources: {
        runbooks: string[];
        bash: boolean;
        env: string[];
        aws: boolean;
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

    const config: NearVarConfig = {
        sources: {
            runbooks: toStringArray(s.runbooks),
            bash: s.bash === true,
            env: toStringArray(s.env),
            aws: s.aws === true,
        },
    };

    return { ok: true, config };
}

function toStringArray(val: unknown): string[] {
    if (!Array.isArray(val)) { return []; }
    return val.filter((x): x is string => typeof x === 'string');
}
