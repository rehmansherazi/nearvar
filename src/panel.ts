import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, NearVarConfig } from './configReader';
import { readBashVars, readEnvFile, BashVar } from './bashReader';
import { readDocSources, DocBlock } from './docReader';
import { readAwsProfiles, AwsProfile } from './awsReader';

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
    private _yamlWatcher?: vscode.FileSystemWatcher;
    private _docWatchers: vscode.FileSystemWatcher[] = [];

    constructor(private readonly _context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this._getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async msg => {
            switch (msg.command) {
                case 'createConfig':
                    this._createNearvarYaml();
                    break;
                case 'paste': {
                    const value = msg.value as string;
                    const terminal = vscode.window.activeTerminal;
                    if (terminal) {
                        terminal.show();
                        terminal.sendText(value, false);
                    } else {
                        const newTerminal = vscode.window.createTerminal('NearVar');
                        newTerminal.show();
                        setTimeout(() => newTerminal.sendText(value, false), 500);
                    }
                    break;
                }
                case 'copy':
                    await vscode.env.clipboard.writeText(msg.value as string);
                    break;
            }
        });

        const folder = vscode.workspace.workspaceFolders?.[0];
        if (folder) {
            this._yamlWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(folder, 'nearvar.yaml')
            );
            this._yamlWatcher.onDidCreate(() => this._refresh());
            this._yamlWatcher.onDidChange(() => this._refresh());
            this._yamlWatcher.onDidDelete(() => this._refresh());
        }

        this._setupDocWatchers();

        webviewView.onDidDispose(() => {
            this._yamlWatcher?.dispose();
            this._yamlWatcher = undefined;
            this._docWatchers.forEach(w => w.dispose());
            this._docWatchers = [];
            this._view = undefined;
        });
    }

    private _refresh(): void {
        this._docWatchers.forEach(w => w.dispose());
        this._docWatchers = [];
        if (this._view) {
            this._view.webview.html = this._getHtml(this._view.webview);
        }
        this._setupDocWatchers();
    }

    private _setupDocWatchers(): void {
        if (!this._hasConfig()) { return; }
        const p = this._configPath()!;
        const result = loadConfig(p);
        if (!result.ok) { return; }
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) { return; }

        for (const entry of result.config.sources.runbooks) {
            const abs = path.isAbsolute(entry.path) ? entry.path : path.join(workspaceRoot, entry.path);
            let stat: fs.Stats | undefined;
            try { stat = fs.statSync(abs); } catch { /* not found */ }
            if (!stat) { continue; }

            const pattern = stat.isDirectory()
                ? new vscode.RelativePattern(vscode.Uri.file(abs), '**/*.md')
                : new vscode.RelativePattern(vscode.Uri.file(path.dirname(abs)), path.basename(abs));
            const w = vscode.workspace.createFileSystemWatcher(pattern);
            w.onDidCreate(() => this._refresh());
            w.onDidChange(() => this._refresh());
            w.onDidDelete(() => this._refresh());
            this._docWatchers.push(w);
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
            '  runbooks:',
            '    # Shorthand — index a single file directly',
            '    # - ./runbooks/deploy.md',
            '    #',
            '    # Shorthand — index all .md files in a folder (recursive)',
            '    # - ~/oncall/playbooks/procedures/',
            '    #',
            '    # Full options — folder with recursive and exclude control',
            '    # - path: ~/oncall/playbooks/',
            '    #   recursive: false     # top-level files only',
            '    #   exclude:',
            '    #     - "*.draft.md"     # skip draft files',
            '    #     - "archive/*"      # skip archive subfolder',
            '    []',
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
        let configError: string | undefined;
        let config: NearVarConfig | undefined;
        if (this._hasConfig()) {
            const p = this._configPath()!;
            const result = loadConfig(p);
            if (result.ok) {
                config = result.config;
            } else {
                configError = result.error;
            }
        }
        const body = this._hasConfig() ? this._mainContent(config, configError) : this._welcomeCard();

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
  .error-card { border: 1px solid var(--vscode-inputValidation-errorBorder); border-radius: 3px; padding: 8px 10px; margin-bottom: 10px; }
  .error-title { font-size: 11px; font-weight: 600; color: var(--vscode-inputValidation-errorForeground, #f48771); margin-bottom: 4px; }
  .error-msg { font-size: 11px; color: var(--vscode-descriptionForeground); font-family: var(--vscode-editor-font-family, monospace); word-break: break-word; }
  .dynamic { color: var(--vscode-editorWarning-foreground, #cca700); }
  .block-group { margin: 1px 0; }
  .block-header { display: flex; align-items: center; padding: 4px 4px; border-radius: 3px; cursor: pointer; gap: 4px; }
  .block-header:hover { background: var(--vscode-list-hoverBackground); }
  .block-arrow { flex-shrink: 0; font-size: 10px; width: 12px; text-align: center; color: var(--vscode-descriptionForeground); }
  .block-source { font-weight: normal; color: var(--vscode-descriptionForeground); font-size: 10px; }
  .block-lines { padding-left: 16px; }
  .source-error { font-size: 11px; color: var(--vscode-editorWarning-foreground, #cca700); padding: 3px 4px; }
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
    document.querySelectorAll('.block-header').forEach(function(h) {
      h.addEventListener('click', function() {
        var lines = this.nextElementSibling;
        var arrow = this.querySelector('.block-arrow');
        lines.hidden = !lines.hidden;
        arrow.textContent = lines.hidden ? '▶' : '▼';
      });
    });
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

    private _mainContent(config?: NearVarConfig, error?: string): string {
        const errorCard = error
            ? `<div class="error-card"><div class="error-title">nearvar.yaml error</div><div class="error-msg">${escapeHtml(error)}</div></div>`
            : '';

        if (!config) { return errorCard; }

        const item = (label: string, value: string) => {
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
        const section = (title: string, items: string) =>
            `<div class="section-label">${escapeHtml(title)}</div>${items}`;
        const varItem = (v: BashVar): string => {
            const eName = escapeHtml(v.name);
            const pasteVal = v.dynamic ? `$${eName}` : escapeHtml(v.value);
            const valueSpan = v.dynamic
                ? `<span class="item-value dynamic">&#9888; dynamic</span>`
                : `<span class="item-value">${escapeHtml(v.value)}</span>`;
            return `<div class="item" data-value="${pasteVal}">` +
                `<div class="item-body">` +
                `<span class="item-label">${eName}</span>` +
                valueSpan +
                `</div>` +
                `<button class="copy-btn" data-value="${pasteVal}">Copy</button>` +
                `</div>`;
        };

        const bashVars = config.sources.bash ? readBashVars() : [];
        const bashSection = bashVars.length > 0
            ? section('Bash Variables', bashVars.map(varItem).join(''))
            : '';

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        const docResults = workspaceRoot && config.sources.runbooks.length > 0
            ? readDocSources(config.sources.runbooks, workspaceRoot)
            : [];
        const renderBlock = (b: DocBlock): string => {
            const eLabel = escapeHtml(b.label);
            const eRel   = escapeHtml(b.relPath);
            const eAbs   = escapeHtml(b.absPath);
            if (b.lines.length === 1) {
                const ev = escapeHtml(b.lines[0]);
                return `<div class="item" data-value="${ev}" title="${eAbs}">` +
                    `<div class="item-body">` +
                    `<span class="item-label">${eLabel}<span class="block-source"> · ${eRel}</span></span>` +
                    `<span class="item-value">${ev}</span>` +
                    `</div>` +
                    `<button class="copy-btn" data-value="${ev}">Copy</button>` +
                    `</div>`;
            }
            const children = b.lines.map(line => {
                const ev = escapeHtml(line);
                return `<div class="item" data-value="${ev}">` +
                    `<div class="item-body"><span class="item-value">${ev}</span></div>` +
                    `<button class="copy-btn" data-value="${ev}">Copy</button>` +
                    `</div>`;
            }).join('');
            return `<div class="block-group">` +
                `<div class="block-header" title="${eAbs}">` +
                `<span class="block-arrow">▶</span>` +
                `<div class="item-body">` +
                `<span class="item-label">${eLabel}<span class="block-source"> · ${eRel}</span></span>` +
                `<span class="item-value">${b.lines.length} commands</span>` +
                `</div></div>` +
                `<div class="block-lines" hidden>${children}</div>` +
                `</div>`;
        };
        const docItems = docResults.flatMap(sr =>
            sr.error
                ? [`<div class="source-error">&#9888; ${escapeHtml(sr.sourcePath)} — ${escapeHtml(sr.error)}</div>`]
                : sr.blocks.map(renderBlock)
        );
        const runbooksSection = docItems.length > 0
            ? section('Runbooks', docItems.join(''))
            : '';

        const envVars: BashVar[] = [];
        if (workspaceRoot) {
            for (const rel of config.sources.env) {
                envVars.push(...readEnvFile(path.join(workspaceRoot, rel), path.basename(rel)));
            }
        }
        const envSection = envVars.length > 0
            ? section('.env Variables', envVars.map(varItem).join(''))
            : '';

        const awsProfiles = config.sources.aws ? readAwsProfiles() : [];
        const awsProfileItem = (p: AwsProfile): string => {
            const eName = escapeHtml(p.name);
            const pasteVal = `--profile ${eName}`;
            const regionSpan = p.region
                ? `<span class="item-value">${escapeHtml(p.region)}</span>`
                : '';
            return `<div class="item" data-value="${pasteVal}">` +
                `<div class="item-body">` +
                `<span class="item-label">${eName}</span>` +
                regionSpan +
                `</div>` +
                `<button class="copy-btn" data-value="${pasteVal}">Copy</button>` +
                `</div>`;
        };
        const awsSection = awsProfiles.length > 0
            ? section('AWS Profiles', awsProfiles.map(awsProfileItem).join(''))
            : '';

        return [
            runbooksSection,
            '<div class="divider"></div>',
            bashSection,
            envSection,
            awsSection,
            '<div class="divider"></div>',
            section('Custom', item('Running containers', 'docker ps -a')),
        ].join('');
    }
}
