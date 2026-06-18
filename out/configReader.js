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
exports.loadConfig = loadConfig;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const MAX_BYTES = 512 * 1024;
function loadConfig(configPath) {
    let raw;
    try {
        const stat = fs.statSync(configPath);
        if (stat.size > MAX_BYTES) {
            return { ok: false, error: 'nearvar.yaml exceeds 512 KB — file skipped.' };
        }
        raw = fs.readFileSync(configPath, 'utf8');
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `Could not read nearvar.yaml: ${msg}` };
    }
    let parsed;
    try {
        parsed = yaml.load(raw);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: `YAML parse error: ${msg}` };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'nearvar.yaml must be a YAML mapping at the top level.' };
    }
    const obj = parsed;
    const src = obj.sources;
    if (src !== undefined && (!src || typeof src !== 'object' || Array.isArray(src))) {
        return { ok: false, error: "'sources' must be a YAML mapping." };
    }
    const s = (src ?? {});
    const config = {
        sources: {
            runbooks: toRunbookArray(s.runbooks),
            bash: s.bash === true,
            env: toStringArray(s.env),
            aws: s.aws === true,
        },
    };
    return { ok: true, config };
}
function toRunbookArray(val) {
    if (!Array.isArray(val)) {
        return [];
    }
    return val.flatMap((entry) => {
        if (typeof entry === 'string') {
            return [{ path: entry, recursive: true, exclude: [] }];
        }
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            const e = entry;
            if (typeof e['path'] !== 'string') {
                console.warn('NearVar: skipping runbook entry — missing or invalid path');
                return [];
            }
            return [{
                    path: e['path'],
                    recursive: e['recursive'] !== false,
                    exclude: toStringArray(e['exclude']),
                }];
        }
        console.warn('NearVar: skipping runbook entry — invalid type');
        return [];
    });
}
function toStringArray(val) {
    if (!Array.isArray(val)) {
        return [];
    }
    return val.filter((x) => typeof x === 'string');
}
//# sourceMappingURL=configReader.js.map