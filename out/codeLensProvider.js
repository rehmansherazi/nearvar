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
exports.NearVarCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const minimatch_1 = require("minimatch");
const configReader_1 = require("./configReader");
const docReader_1 = require("./docReader");
function isFileInSource(filePath, entry, workspaceRoot) {
    const abs = path.normalize(path.isAbsolute(entry.path) ? entry.path : path.join(workspaceRoot, entry.path)).replace(/[/\\]+$/, '');
    let stat;
    try {
        stat = fs.statSync(abs);
    }
    catch {
        return false;
    }
    if (stat.isFile()) {
        return abs === filePath;
    }
    if (stat.isDirectory()) {
        if (!filePath.startsWith(abs + path.sep)) {
            return false;
        }
        if (!filePath.endsWith('.md')) {
            return false;
        }
        const relPath = path.relative(abs, filePath);
        if (!entry.recursive && relPath.includes(path.sep)) {
            return false;
        }
        if (entry.exclude.some(pattern => (0, minimatch_1.minimatch)(relPath, pattern))) {
            return false;
        }
        return true;
    }
    return false;
}
class NearVarCodeLensProvider {
    provideCodeLenses(document, _token) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return [];
        }
        const workspaceRoot = folders[0].uri.fsPath;
        const configPath = path.join(workspaceRoot, 'nearvar.yaml');
        const result = (0, configReader_1.loadConfig)(configPath);
        if (!result.ok) {
            return [];
        }
        const filePath = document.uri.fsPath;
        const inSource = result.config.sources.runbooks.some(entry => isFileInSource(filePath, entry, workspaceRoot));
        if (!inSource) {
            return [];
        }
        const blocks = (0, docReader_1.parseBlocks)(document.getText(), '', filePath);
        return blocks.map(block => {
            const range = new vscode.Range(block.fenceLine, 0, block.fenceLine, 0);
            const pasteValue = block.lines.join(' && ');
            const title = `▶ NearVar: ${block.label}`;
            return new vscode.CodeLens(range, {
                title,
                command: 'nearvar.pasteToTerminal',
                arguments: [pasteValue],
            });
        });
    }
}
exports.NearVarCodeLensProvider = NearVarCodeLensProvider;
//# sourceMappingURL=codeLensProvider.js.map