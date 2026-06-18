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
exports.readAwsProfiles = readAwsProfiles;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const MAX_BYTES = 512 * 1024;
const SECTION_RE = /^\[(.+)\]$/;
const KV_RE = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/;
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
function parseIni(raw) {
    const sections = [];
    let current = null;
    for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
            continue;
        }
        const sm = trimmed.match(SECTION_RE);
        if (sm) {
            current = { name: sm[1], keys: {} };
            sections.push(current);
            continue;
        }
        const km = trimmed.match(KV_RE);
        if (km && current) {
            current.keys[km[1]] = km[2].trim();
        }
    }
    return sections;
}
function parseConfig(raw) {
    return parseIni(raw).map(s => ({
        name: s.name === 'default' ? 'default' : s.name.replace(/^profile\s+/, ''),
        region: s.keys['region'] ?? '',
    }));
}
function parseCredentialNames(raw) {
    return parseIni(raw).map(s => s.name);
}
function readAwsProfiles() {
    const awsDir = path.join(os.homedir(), '.aws');
    const configRaw = readRaw(path.join(awsDir, 'config'));
    const credsRaw = readRaw(path.join(awsDir, 'credentials'));
    const profileMap = new Map();
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
//# sourceMappingURL=awsReader.js.map