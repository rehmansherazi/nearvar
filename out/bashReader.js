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
exports.readBashVars = readBashVars;
exports.readEnvFile = readEnvFile;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const MAX_BYTES = 512 * 1024;
const EXPORT_RE = /^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
const ENV_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;
const QUOTE_RE = /^(['"])(.*)\1$/s;
const DYNAMIC_RE = /\$\(/;
function stripQuotes(val) {
    const m = val.match(QUOTE_RE);
    return m ? m[2] : val;
}
function parseLines(lines, pattern, source, file) {
    const results = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const m = trimmed.match(pattern);
        if (!m) {
            continue;
        }
        const name = m[1];
        const raw = stripQuotes(m[2]);
        const dynamic = DYNAMIC_RE.test(raw);
        results.push({ name, value: dynamic ? '' : raw, dynamic, source, file });
    }
    return results;
}
function readLines(filePath) {
    try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_BYTES) {
            return null;
        }
        return fs.readFileSync(filePath, 'utf8').split('\n');
    }
    catch {
        return null;
    }
}
function readBashVars() {
    const file = process.platform === 'darwin' ? '.bash_profile' : '.bashrc';
    const lines = readLines(path.join(os.homedir(), file));
    if (!lines) {
        return [];
    }
    return parseLines(lines, EXPORT_RE, 'bash', file);
}
function readEnvFile(absPath, displayName) {
    const lines = readLines(absPath);
    if (!lines) {
        return [];
    }
    return parseLines(lines, ENV_RE, 'env', displayName);
}
//# sourceMappingURL=bashReader.js.map