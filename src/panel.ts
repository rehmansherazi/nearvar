import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export class NearVarPanel implements vscode.WebviewViewProvider {
    static readonly viewType = 'nearvar.panel';
    private _view?: vscode.WebviewView;

    constructor(private readonly _context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(msg => {
            if (msg.command === 'createConfig') {
                this._createNearvarYaml();
            }
        });

        webviewView.onDidDispose(() => {
            this._view = undefined;
        });
    }

    private _refresh(): void {
        if (this._view) {
            this._view.webview.html = this._getHtml(this._view.webview);
        }
    }

    private _configPath(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { return undefined; }
        return path.join(folders[0].uri.fsPath, 'nearvar.yaml');
    }

    private _hasConfig(): boolean {
        const p = this._configPath();
        if (!p) { return false; }
        try {
            fs.statSync(p);
            return true;
        } catch {
            return false;
        }
    }

    private _createNearvarYaml(): void {
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
        } catch {
            vscode.window.showErrorMessage('NearVar: Could not create nearvar.yaml. Check folder permissions.');
            return;
        }
        this._refresh();
        vscode.workspace.openTextDocument(p).then(doc =>
            vscode.window.showTextDocument(doc)
        );
    }

    private _getHtml(webview: vscode.Webview): string {
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
  .content { padding: 12px; }
  .welcome-card { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 16px; margin-top: 4px; }
  .welcome-card h2 { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
  .welcome-card p { font-size: 12px; color: var(--vscode-descriptionForeground); margin: 0 0 12px; line-height: 1.5; }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  .placeholder { font-size: 12px; color: var(--vscode-descriptionForeground); padding: 20px 0; text-align: center; }
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
    function createConfig() {
      vscode.postMessage({ command: 'createConfig' });
    }
  </script>
</body>
</html>`;
    }

    private _welcomeCard(): string {
        return `<div class="welcome-card">
    <h2>Welcome to NearVar</h2>
    <p>Create a <code>nearvar.yaml</code> in your workspace to configure sources.</p>
    <button onclick="createConfig()">Create nearvar.yaml</button>
  </div>`;
    }

    private _mainContent(): string {
        return `<div class="placeholder">nearvar.yaml found — variables load in SEP-02.</div>`;
    }
}
