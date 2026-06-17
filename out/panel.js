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
exports.NearVarPanel = void 0;
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
class NearVarPanel {
    _context;
    static viewType = 'nearvar.panel';
    _view;
    constructor(_context) {
        this._context = _context;
    }
    resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtml(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case 'createConfig':
                    this._createNearvarYaml();
                    break;
                case 'paste': {
                    const value = msg.value;
                    const terminal = vscode.window.activeTerminal;
                    if (terminal) {
                        terminal.show();
                        terminal.sendText(value, false);
                    }
                    else {
                        const newTerminal = vscode.window.createTerminal('NearVar');
                        newTerminal.show();
                        setTimeout(() => newTerminal.sendText(value, false), 500);
                    }
                    break;
                }
                case 'copy':
                    await vscode.env.clipboard.writeText(msg.value);
                    break;
            }
        });
        webviewView.onDidDispose(() => {
            this._view = undefined;
        });
    }
    _refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtml(this._view.webview);
        }
    }
    _configPath() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return undefined;
        }
        return path.join(folders[0].uri.fsPath, 'nearvar.yaml');
    }
    _hasConfig() {
        const p = this._configPath();
        if (!p) {
            return false;
        }
        try {
            fs.statSync(p);
            return true;
        }
        catch {
            return false;
        }
    }
    _createNearvarYaml() {
        const p = this._configPath();
        if (!p) {
            vscode.window.showErrorMessage('NearVar: No workspace folder open. Open a folder first.');
            return;
        }
        const template = [
            '# nearvar.yaml — NearVar configuration',
            '',
            'sources:',
            '  runbooks: []          # paths to markdown runbook files or folders',
            '  bash: true            # read ~/.bashrc / ~/.bash_profile',
            '  env: []               # .env files relative to this workspace',
            '  aws: true             # read ~/.aws/config profiles',
        ].join('\n') + '\n';
        try {
            fs.writeFileSync(p, template, 'utf8');
        }
        catch {
            vscode.window.showErrorMessage('NearVar: Could not create nearvar.yaml. Check folder permissions.');
            return;
        }
        this._refresh();
        vscode.workspace.openTextDocument(p).then(doc => vscode.window.showTextDocument(doc));
    }
    _getHtml(webview) {
        const context = vscode.env.remoteName ? escapeHtml(vscode.env.remoteName) : 'local';
        const homedir = escapeHtml(os.homedir());
        const body = this._hasConfig() ? this._mainContent() : this._welcomeCard();
        return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
<style>
  body { font-family: var(--vscode-font-family); font-size: 13px; padding: 0; margin: 0; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
  .ctx-bar { font-size: 11px; color: var(--vscode-descriptionForeground); padding: 5px 12px; border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border); display: flex; gap: 6px; }
  .ctx-sep { opacity: 0.4; }
  .content { padding: 8px 8px 16px; }
  .welcome-card { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 16px; margin-top: 4px; }
  .welcome-card h2 { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
  .welcome-card p { font-size: 12px; color: var(--vscode-descriptionForeground); margin: 0 0 12px; line-height: 1.5; }
  .welcome-card button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px; }
  .welcome-card button:hover { background: var(--vscode-button-hoverBackground); }
  .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); padding: 10px 4px 3px; }
  .item { display: flex; align-items: center; padding: 4px 4px; border-radius: 3px; cursor: pointer; gap: 4px; }
  .item:hover { background: var(--vscode-list-hoverBackground); }
  .item-body { flex: 1; min-width: 0; }
  .item-label { display: block; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item-value { display: block; font-size: 11px; color: var(--vscode-descriptionForeground); font-family: var(--vscode-editor-font-family, monospace); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .copy-btn { flex-shrink: 0; background: transparent; color: var(--vscode-descriptionForeground); border: 1px solid var(--vscode-widget-border, #555); padding: 2px 7px; border-radius: 3px; cursor: pointer; font-size: 10px; opacity: 0; }
  .item:hover .copy-btn { opacity: 1; }
  .copy-btn:hover { background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-foreground); }
  .divider { height: 1px; background: var(--vscode-sideBarSectionHeader-border); margin: 6px 0; }
</style>
</head>
<body>
  <div class="ctx-bar">
    <span>${context}</span><span class="ctx-sep">·</span><span>${homedir}</span>
  </div>
  <div class="content">
    ${body}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function createConfig() { vscode.postMessage({ command: 'createConfig' }); }
    function paste(value) { vscode.postMessage({ command: 'paste', value: value }); }
    function copy(value) { vscode.postMessage({ command: 'copy', value: value }); }
    document.querySelectorAll('.item').forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (e.target.closest('.copy-btn')) { return; }
        paste(this.dataset.value);
      });
    });
    document.querySelectorAll('.copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        copy(this.dataset.value);
      });
    });
  </script>
</body>
</html>`;
    }
    _welcomeCard() {
        return `<div class="welcome-card">
    <h2>Welcome to NearVar</h2>
    <p>Create a <code>nearvar.yaml</code> in your workspace to configure sources.</p>
    <button onclick="createConfig()">Create nearvar.yaml</button>
  </div>`;
    }
    _mainContent() {
        const item = (label, value) => {
            const el = escapeHtml(label);
            const ev = escapeHtml(value);
            return `<div class="item" data-value="${ev}">` +
                `<div class="item-body">` +
                `<span class="item-label">${el}</span>` +
                `<span class="item-value">${ev}</span>` +
                `</div>` +
                `<button class="copy-btn" data-value="${ev}">Copy</button>` +
                `</div>`;
        };
        const section = (title, items) => `<div class="section-label">${escapeHtml(title)}</div>${items}`;
        return [
            section('Runbooks', item('Check pods', 'kubectl get pods -n production')),
            '<div class="divider"></div>',
            section('Bash Variables', item('DATABASE_URL', '$DATABASE_URL')),
            section('.env Variables', item('APP_PORT', '$APP_PORT')),
            section('AWS Profiles', item('default', 'aws sts get-caller-identity --profile default')),
            '<div class="divider"></div>',
            section('Custom', item('Running containers', 'docker ps -a')),
        ].join('');
    }
}
exports.NearVarPanel = NearVarPanel;
//# sourceMappingURL=panel.js.map