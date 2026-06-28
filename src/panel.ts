import * as vscode from 'vscode';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, NearVarConfig } from './configReader';
import { readBashVars, readEnvFile, BashVar, isSensitive } from './bashReader';
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
    private _homeYamlWatcher?: vscode.FileSystemWatcher;
    private _docWatchers: vscode.FileSystemWatcher[] = [];
    private _activeFolder: vscode.WorkspaceFolder | undefined;
    private _yamlWasDeleted = false;

    constructor(private readonly _context: vscode.ExtensionContext) {}

    async resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };

        this._activeFolder = await this._resolveFolder();

        webviewView.webview.html = this._getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async msg => {
            switch (msg.command) {
                case 'createConfig':
                    this._createNearvarYaml(msg.target === 'workspace' ? 'workspace' : 'home');
                    break;
                case 'paste': {
                    if (typeof msg.value !== 'string') { break; }
                    const value = msg.value;
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
                case 'copy': {
                    if (typeof msg.value !== 'string') { break; }
                    await vscode.env.clipboard.writeText(msg.value);
                    break;
                }
            }
        });

        if (this._activeFolder) {
            this._yamlWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this._activeFolder, 'nearvar.yaml')
            );
            this._yamlWatcher.onDidCreate(() => this._refresh());
            this._yamlWatcher.onDidChange(() => this._refresh());
            this._yamlWatcher.onDidDelete(() => { this._yamlWasDeleted = true; this._refresh(); });
        }

        this._homeYamlWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(vscode.Uri.file(os.homedir()), 'nearvar.yaml')
        );
        this._homeYamlWatcher.onDidCreate(() => this._refresh());
        this._homeYamlWatcher.onDidChange(() => this._refresh());
        this._homeYamlWatcher.onDidDelete(() => { this._yamlWasDeleted = true; this._refresh(); });

        this._setupDocWatchers();

        const editorSub = vscode.window.onDidChangeActiveTextEditor(() => {
            if (!this._hasConfig() && this._view) {
                const folderPath = this._getCreateFolder() ?? '';
                void this._view.webview.postMessage({ command: 'updateCreateHint', path: folderPath });
            }
        });

        const workspaceFolderSub = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            this._activeFolder = await this._resolveFolder();
            this._resetYamlWatcher();
            this._refresh();
        });

        webviewView.onDidDispose(() => {
            editorSub.dispose();
            workspaceFolderSub.dispose();
            this._yamlWatcher?.dispose();
            this._yamlWatcher = undefined;
            this._homeYamlWatcher?.dispose();
            this._homeYamlWatcher = undefined;
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
        const { config } = this._loadActiveConfig();
        if (!config) { return; }
        const wsRoot = this._activeFolder?.uri.fsPath;

        for (const entry of config.sources.runbooks) {
            const abs = path.isAbsolute(entry.path)
                ? entry.path
                : (wsRoot ? path.join(wsRoot, entry.path) : undefined);
            if (!abs) { continue; }
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

    private async _resolveFolder(): Promise<vscode.WorkspaceFolder | undefined> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { return undefined; }
        if (folders.length === 1) { return folders[0]; }

        const withConfig = folders.filter(f =>
            fs.existsSync(path.join(f.uri.fsPath, 'nearvar.yaml'))
        );

        if (withConfig.length === 0) { return folders[0]; }
        if (withConfig.length === 1) { return withConfig[0]; }

        const items = withConfig.map(f => ({
            label: f.name,
            description: f.uri.fsPath,
            folder: f,
        }));
        const pick = await vscode.window.showQuickPick(items, {
            placeHolder: 'Multiple folders have nearvar.yaml — pick one',
        });
        return pick?.folder ?? withConfig[0];
    }

    private _configPath(): string | undefined {
        if (!this._activeFolder) { return undefined; }
        return path.join(this._activeFolder.uri.fsPath, 'nearvar.yaml');
    }

    private _hasConfig(): boolean {
        if (fs.existsSync(path.join(os.homedir(), 'nearvar.yaml'))) { return true; }
        const p = this._configPath();
        if (!p) { return false; }
        try { fs.statSync(p); return true; } catch { return false; }
    }

    private _loadActiveConfig(): {
        config?: NearVarConfig;
        error?: string;
        source: 'none' | 'home' | 'workspace' | 'both';
    } {
        const homePath = path.join(os.homedir(), 'nearvar.yaml');
        const wsPath = this._configPath();
        const homeExists = fs.existsSync(homePath);
        const wsExists = wsPath ? fs.existsSync(wsPath) : false;

        if (!homeExists && !wsExists) { return { source: 'none' }; }

        if (homeExists && !wsExists) {
            const r = loadConfig(homePath);
            if (!r.ok) { return { error: r.error, source: 'home' }; }
            const homedir = os.homedir();
            return {
                config: {
                    ...r.config,
                    sources: {
                        ...r.config.sources,
                        runbooks: r.config.sources.runbooks.map(e => ({
                            ...e,
                            path: path.isAbsolute(e.path) ? e.path : path.join(homedir, e.path),
                        })),
                    },
                },
                source: 'home',
            };
        }

        if (!homeExists && wsExists) {
            const r = loadConfig(wsPath!);
            return r.ok ? { config: r.config, source: 'workspace' } : { error: r.error, source: 'workspace' };
        }

        // Both exist — deep merge: home as base, workspace as override
        const homeR = loadConfig(homePath);
        const wsR = loadConfig(wsPath!);

        if (!homeR.ok && !wsR.ok) {
            return { error: `Home: ${homeR.error} | Workspace: ${wsR.error}`, source: 'both' };
        }
        if (!homeR.ok) {
            return wsR.ok
                ? { config: wsR.config, error: homeR.error, source: 'both' }
                : { error: homeR.error, source: 'both' };
        }
        if (!wsR.ok) {
            return { config: homeR.config, error: wsR.error, source: 'both' };
        }

        const home = homeR.config;
        const ws = wsR.config;
        const homedir = os.homedir();

        const homeRunbooks = home.sources.runbooks.map(e => ({
            ...e,
            path: path.isAbsolute(e.path) ? e.path : path.join(homedir, e.path),
        }));
        const homeEnv = home.sources.env.map(e =>
            path.isAbsolute(e) ? e : path.join(homedir, e)
        );

        return {
            config: {
                sources: {
                    runbooks: [...homeRunbooks, ...ws.sources.runbooks],
                    bash: home.sources.bash || ws.sources.bash,
                    env: [...homeEnv, ...ws.sources.env],
                    aws: home.sources.aws || ws.sources.aws,
                },
                ui: ws.ui,
            },
            source: 'both',
        };
    }

    private _getCreateFolder(): string | undefined {
        const activeUri = vscode.window.activeTextEditor?.document.uri;
        if (activeUri && activeUri.scheme === 'file') {
            const wf = vscode.workspace.getWorkspaceFolder(activeUri);
            if (wf) { return wf.uri.fsPath; }
        }
        return this._activeFolder?.uri.fsPath;
    }

    private _resetYamlWatcher(): void {
        this._yamlWatcher?.dispose();
        this._yamlWatcher = undefined;
        if (this._activeFolder) {
            this._yamlWatcher = vscode.workspace.createFileSystemWatcher(
                new vscode.RelativePattern(this._activeFolder, 'nearvar.yaml')
            );
            this._yamlWatcher.onDidCreate(() => this._refresh());
            this._yamlWatcher.onDidChange(() => this._refresh());
            this._yamlWatcher.onDidDelete(() => { this._yamlWasDeleted = true; this._refresh(); });
        }
    }

    async switchFolder(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showInformationMessage('NearVar: No workspace folders open.');
            return;
        }
        const items = folders.map(f => ({
            label: f.name,
            description: f.uri.fsPath,
            folder: f,
        }));
        const pick = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select workspace folder for NearVar',
        });
        if (pick) {
            this._activeFolder = pick.folder;
            this._resetYamlWatcher();
            this._refresh();
        }
    }

    private _createNearvarYaml(target: 'home' | 'workspace' = 'home'): void {
        const folderPath = target === 'home'
            ? os.homedir()
            : (this._getCreateFolder() ?? os.homedir());
        const p = path.join(folderPath, 'nearvar.yaml');
        if (fs.existsSync(p)) {
            vscode.workspace.openTextDocument(p).then(doc => vscode.window.showTextDocument(doc));
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
            '    # - ~/teams/engineering/runbooks/',
            '    #',
            '    # Full options — folder with recursive and exclude control',
            '    # - path: ~/teams/engineering/runbooks/',
            '    #   recursive: false     # top-level files only',
            '    #   exclude:',
            '    #     - "*.draft.md"     # skip draft files',
            '    #     - "archive/*"      # skip archive subfolder',
            '    []',
            '  bash: true            # read ~/.bashrc / ~/.bash_profile',
            '  env: []               # .env files relative to this workspace',
            '  aws: true             # read ~/.aws/config profiles',
            '',
            'ui:',
            '  # Sections collapsed by default — expand by clicking the header',
            '  # Valid values: runbooks, bash, env, aws, custom',
            '  collapsed: []',
            '',
            '# ─────────────────────────────────────────────────────────────',
            '# Quick start with realistic demo data:',
            '#',
            '#   bash demoscripts/nearvar_demo_setup.sh    # populate demo data',
            '#   bash demoscripts/nearvar_demo_cleanup.sh  # remove demo data',
            '#',
            '# Demo scripts live in demoscripts/ in the NearVar repo:',
            '#   https://github.com/rehmansherazi/nearvar',
            '# ─────────────────────────────────────────────────────────────',
        ].join('\n') + '\n';
        try {
            fs.writeFileSync(p, template, 'utf8');
        } catch {
            vscode.window.showErrorMessage('NearVar: Could not create nearvar.yaml. Check folder permissions.');
            return;
        }
        const newFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(p));
        if (newFolder) {
            this._activeFolder = newFolder;
            this._resetYamlWatcher();
        }
        this._refresh();
        vscode.workspace.openTextDocument(p).then(doc =>
            vscode.window.showTextDocument(doc)
        );
    }

    private _getHtml(webview: vscode.Webview): string {
        const context = vscode.env.remoteName ? escapeHtml(vscode.env.remoteName) : 'local';
        const { config, error: configError, source } = this._loadActiveConfig();
        const noWorkspace = !vscode.workspace.workspaceFolders?.length;

        let sourceLabel: string;
        let workspaceRoot: string | undefined;
        if (source === 'home') {
            sourceLabel = '~';
            workspaceRoot = os.homedir();
        } else if (source === 'workspace') {
            sourceLabel = escapeHtml(this._activeFolder?.uri.fsPath ?? os.homedir());
            workspaceRoot = this._activeFolder?.uri.fsPath;
        } else if (source === 'both') {
            sourceLabel = '~ + workspace';
            workspaceRoot = this._activeFolder?.uri.fsPath;
        } else {
            sourceLabel = noWorkspace ? 'no folder' : escapeHtml(this._activeFolder?.uri.fsPath ?? os.homedir());
            workspaceRoot = undefined;
        }

        let body: string;
        if (source !== 'none') {
            this._yamlWasDeleted = false;
            body = this._mainContent(config, configError, workspaceRoot);
        } else if (noWorkspace) {
            const terminalConfig: NearVarConfig = {
                sources: { runbooks: [], bash: true, env: [], aws: true },
                ui: { collapsed: [] },
            };
            body = this._noFolderCard() + this._mainContent(terminalConfig, undefined, undefined);
        } else {
            body = this._welcomeCard();
        }
        const searchBar = config ? `<div class="search-bar"><input type="text" id="nv-search" placeholder="Filter..." autocomplete="off" spellcheck="false"></div>` : '';

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
  .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vscode-descriptionForeground); padding: 10px 4px 3px; cursor: pointer; display: flex; align-items: center; gap: 4px; user-select: none; }
  .section-label:hover { color: var(--vscode-foreground); }
  .section-chevron { font-size: 10px; opacity: 0.7; flex-shrink: 0; }
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
  .search-bar { padding: 5px 8px; border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border); }
  #nv-search { width: 100%; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); padding: 4px 6px; font-family: var(--vscode-font-family); font-size: 12px; border-radius: 2px; outline: none; }
  #nv-search:focus { border-color: var(--vscode-focusBorder); }
  #nv-search::placeholder { color: var(--vscode-input-placeholderForeground); }
  [hidden] { display: none !important; }
</style>
</head>
<body>
  <div class="ctx-bar">
    <span>${context}</span><span class="ctx-sep">·</span><span>${sourceLabel}</span>
  </div>
  ${searchBar}
  <div class="content">
    ${body}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function createConfig(target) { vscode.postMessage({ command: 'createConfig', target: target || 'home' }); }
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
    document.querySelectorAll('.section-label').forEach(function(label) {
      label.addEventListener('click', function() {
        var items = this.nextElementSibling;
        var chevron = this.querySelector('.section-chevron');
        items.hidden = !items.hidden;
        if (chevron) { chevron.innerHTML = items.hidden ? '&#9658;' : '&#9660;'; }
      });
    });
    var _nvSearch = document.getElementById('nv-search');
    if (_nvSearch) {
      var _debounce;
      var _collapseSnapshot = null;
      _nvSearch.addEventListener('input', function() {
        clearTimeout(_debounce);
        var val = this.value;
        var trimmed = val.trim();
        if (_collapseSnapshot === null && trimmed !== '') {
          _collapseSnapshot = new Map();
          document.querySelectorAll('.section-items').forEach(function(si) {
            _collapseSnapshot.set(si, si.hidden);
            si.hidden = false;
          });
        }
        _debounce = setTimeout(function() { applyFilter(trimmed.toLowerCase()); }, 150);
      });
      function applyFilter(q) {
        var isEmpty = q === '';
        document.querySelectorAll('.section-items > .item').forEach(function(el) {
          el.hidden = !isEmpty && !(el.dataset.searchTerms || '').toLowerCase().includes(q);
        });
        document.querySelectorAll('.section-items > .block-group').forEach(function(el) {
          el.hidden = !isEmpty && !(el.dataset.searchTerms || '').toLowerCase().includes(q);
        });
        document.querySelectorAll('.section-wrapper').forEach(function(wrapper) {
          var sectionItems = wrapper.querySelector('.section-items');
          if (!sectionItems) { return; }
          if (isEmpty) {
            if (_collapseSnapshot !== null) {
              sectionItems.hidden = _collapseSnapshot.get(sectionItems) || false;
            }
            wrapper.hidden = false;
            return;
          }
          var hasVisible = Array.from(sectionItems.querySelectorAll(':scope > .item, :scope > .block-group')).some(function(c) { return !c.hidden; });
          wrapper.hidden = !hasVisible;
        });
        if (isEmpty) { _collapseSnapshot = null; }
      }
    }
    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg.command === 'updateCreateHint') {
        var hint = document.getElementById('nv-create-hint-ws');
        if (hint) { hint.textContent = 'Will be created in: ' + msg.path; }
      }
    });
  </script>
</body>
</html>`;
    }

    private _noFolderCard(): string {
        const deletedNote = this._yamlWasDeleted
            ? `<p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: var(--vscode-editorWarning-foreground, #e5c07b);">nearvar.yaml was moved or deleted.</p>
    <p style="margin: 0 0 10px; font-size: 11px; color: var(--vscode-descriptionForeground);">Create a new one or restore the file to continue.</p>`
            : '';
        return `<div class="welcome-card" style="margin-bottom: 8px;">
    ${deletedNote}<h2>No folder open</h2>
    <p>NearVar can still surface your environment.</p>
    <p style="margin: 0; font-size: 11px; color: var(--vscode-descriptionForeground);">Bash variables and AWS profiles are shown below. Open a folder or add <code>~/nearvar.yaml</code> to enable runbook indexing and .env files.</p>
  </div>`;
    }

    private _welcomeCard(): string {
        const wsPath = escapeHtml(this._getCreateFolder() ?? os.homedir());
        const deletedBanner = this._yamlWasDeleted
            ? `<div style="margin-bottom: 12px; padding: 8px 10px; border: 1px solid var(--vscode-inputValidation-warningBorder, #e5c07b); border-radius: 3px;">
      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600;">nearvar.yaml was moved or deleted.</p>
      <p style="margin: 0; font-size: 11px; color: var(--vscode-descriptionForeground);">Create a new one or restore the file to continue.</p>
    </div>`
            : '';
        return `<div class="welcome-card">
    ${deletedBanner}<h2>Welcome to NearVar</h2>
    <p>Create a <code>nearvar.yaml</code> to configure sources.</p>
    <button onclick="createConfig('home')">Create ~/nearvar.yaml</button>
    <p style="margin: 6px 0 10px; font-size: 11px; color: #e5c07b;">Recommended: create in your home folder so NearVar works across all your projects</p>
    <button style="opacity: 0.7;" onclick="createConfig('workspace')">Create in workspace</button>
    <p id="nv-create-hint-ws" style="margin: 4px 0 0; font-size: 11px; color: var(--vscode-descriptionForeground);">Will be created in: ${wsPath}</p>
  </div>`;
    }

    private _mainContent(config?: NearVarConfig, error?: string, workspaceRoot?: string): string {
        const errorCard = error
            ? `<div class="error-card"><div class="error-title">nearvar.yaml error</div><div class="error-msg">${escapeHtml(error)}</div></div>`
            : '';

        if (!config) { return errorCard; }

        const collapsedSet = new Set(config.ui.collapsed);

        const item = (label: string, value: string) => {
            const el = escapeHtml(label);
            const ev = escapeHtml(value);
            const et = escapeHtml(label + '|' + value);
            return `<div class="item" data-value="${ev}" data-search-terms="${et}">` +
                `<div class="item-body">` +
                `<span class="item-label">${el}</span>` +
                `<span class="item-value">${ev}</span>` +
                `</div>` +
                `<button class="copy-btn" data-value="${ev}">Copy</button>` +
                `</div>`;
        };
        const section = (title: string, items: string, collapsed: boolean = false) => {
            const chevron = collapsed ? '&#9658;' : '&#9660;';
            return `<div class="section-wrapper">` +
                `<div class="section-label"><span class="section-chevron">${chevron}</span>${escapeHtml(title)}</div>` +
                `<div class="section-items" data-collapsed-default="${collapsed}"${collapsed ? ' hidden' : ''}>${items}</div>` +
                `</div>`;
        };
        const varItem = (v: BashVar): string => {
            const eName = escapeHtml(v.name);
            const sensitive = isSensitive(v.name);
            const pasteVal = v.dynamic ? `$${eName}` : escapeHtml(v.value);
            const valueSpan = v.dynamic
                ? `<span class="item-value dynamic">&#9888; dynamic</span>`
                : sensitive
                    ? `<span class="item-value">••••••••</span>`
                    : `<span class="item-value">${escapeHtml(v.value)}</span>`;
            const et = (v.dynamic || sensitive) ? eName : escapeHtml(v.name + '|' + v.value);
            return `<div class="item" data-value="${pasteVal}" data-search-terms="${et}">` +
                `<div class="item-body">` +
                `<span class="item-label">${eName}</span>` +
                valueSpan +
                `</div>` +
                `<button class="copy-btn" data-value="${pasteVal}">Copy</button>` +
                `</div>`;
        };
        const envVarItem = (v: BashVar): string => {
            const eName = escapeHtml(v.name);
            const pasteVal = v.dynamic ? `$${eName}` : escapeHtml(v.value);
            const valueSpan = v.dynamic
                ? `<span class="item-value dynamic">&#9888; dynamic</span>`
                : `<span class="item-value">••••••••</span>`;
            return `<div class="item" data-value="${pasteVal}" data-search-terms="${eName}">` +
                `<div class="item-body">` +
                `<span class="item-label">${eName}</span>` +
                valueSpan +
                `</div>` +
                `<button class="copy-btn" data-value="${pasteVal}">Copy</button>` +
                `</div>`;
        };

        const bashVars = config.sources.bash ? readBashVars() : [];
        const bashSection = bashVars.length > 0
            ? section('Bash Variables', bashVars.map(varItem).join(''), collapsedSet.has('bash'))
            : '';

        const docResults = workspaceRoot && config.sources.runbooks.length > 0
            ? readDocSources(config.sources.runbooks, workspaceRoot)
            : [];
        const renderBlock = (b: DocBlock): string => {
            const eLabel = escapeHtml(b.label);
            const eRel   = escapeHtml(b.relPath);
            const eAbs   = escapeHtml(b.absPath);
            if (b.lines.length === 1) {
                const ev = escapeHtml(b.lines[0]);
                const et = escapeHtml(b.label + '|' + b.lines[0]);
                return `<div class="item" data-value="${ev}" data-search-terms="${et}" title="${eAbs}">` +
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
            const groupTerms = escapeHtml([b.label, ...b.lines].join('|'));
            return `<div class="block-group" data-search-terms="${groupTerms}">` +
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
            ? section('Runbooks', docItems.join(''), collapsedSet.has('runbooks'))
            : '';

        const envVars: BashVar[] = [];
        for (const rel of config.sources.env) {
            const envPath = path.isAbsolute(rel) ? rel : (workspaceRoot ? path.join(workspaceRoot, rel) : undefined);
            if (envPath) { envVars.push(...readEnvFile(envPath, path.basename(rel))); }
        }
        const envSection = envVars.length > 0
            ? section('.env Variables', envVars.map(envVarItem).join(''), collapsedSet.has('env'))
            : '';

        const awsProfiles = config.sources.aws ? readAwsProfiles() : [];
        const awsProfileItem = (p: AwsProfile): string => {
            const eName = escapeHtml(p.name);
            const pasteVal = `--profile ${eName}`;
            const regionSpan = p.region
                ? `<span class="item-value">${escapeHtml(p.region)}</span>`
                : '';
            const et = escapeHtml(p.name + (p.region ? '|' + p.region : ''));
            return `<div class="item" data-value="${pasteVal}" data-search-terms="${et}">` +
                `<div class="item-body">` +
                `<span class="item-label">${eName}</span>` +
                regionSpan +
                `</div>` +
                `<button class="copy-btn" data-value="${pasteVal}">Copy</button>` +
                `</div>`;
        };
        const awsSection = awsProfiles.length > 0
            ? section('AWS Profiles', awsProfiles.map(awsProfileItem).join(''), collapsedSet.has('aws'))
            : '';

        return [
            runbooksSection,
            '<div class="divider"></div>',
            bashSection,
            envSection,
            awsSection,
            '<div class="divider"></div>',
            section('Custom', item('Running containers', 'docker ps -a'), collapsedSet.has('custom')),
        ].join('');
    }
}
