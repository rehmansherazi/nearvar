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
const configReader_1 = require("./configReader");
const bashReader_1 = require("./bashReader");
const docReader_1 = require("./docReader");
const awsReader_1 = require("./awsReader");
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
    _yamlWatcher;
    _docWatchers = [];
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
                    if (typeof msg.value !== 'string') {
                        break;
                    }
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
                case 'copy': {
                    if (typeof msg.value !== 'string') {
                        break;
                    }
                    await vscode.env.clipboard.writeText(msg.value);
                    break;
                }
            }
        });
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (folder) {
            this._yamlWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, 'nearvar.yaml'));
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
    _refresh() {
        this._docWatchers.forEach(w => w.dispose());
        this._docWatchers = [];
        if (this._view) {
            this._view.webview.html = this._getHtml(this._view.webview);
        }
        this._setupDocWatchers();
    }
    _setupDocWatchers() {
        if (!this._hasConfig()) {
            return;
        }
        const p = this._configPath();
        const result = (0, configReader_1.loadConfig)(p);
        if (!result.ok) {
            return;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            return;
        }
        for (const entry of result.config.sources.runbooks) {
            const abs = path.isAbsolute(entry.path) ? entry.path : path.join(workspaceRoot, entry.path);
            let stat;
            try {
                stat = fs.statSync(abs);
            }
            catch { /* not found */ }
            if (!stat) {
                continue;
            }
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
            '',
            'ui:',
            '  # Sections collapsed by default — expand by clicking the header',
            '  # Valid values: runbooks, bash, env, aws, custom',
            '  collapsed: []',
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
        let configError;
        let config;
        if (this._hasConfig()) {
            const p = this._configPath();
            const result = (0, configReader_1.loadConfig)(p);
            if (result.ok) {
                config = result.config;
            }
            else {
                configError = result.error;
            }
        }
        const body = this._hasConfig() ? this._mainContent(config, configError) : this._welcomeCard();
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
    <span>${context}</span><span class="ctx-sep">·</span><span>${homedir}</span>
  </div>
  ${searchBar}
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
    _mainContent(config, error) {
        const errorCard = error
            ? `<div class="error-card"><div class="error-title">nearvar.yaml error</div><div class="error-msg">${escapeHtml(error)}</div></div>`
            : '';
        if (!config) {
            return errorCard;
        }
        const collapsedSet = new Set(config.ui.collapsed);
        const item = (label, value) => {
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
        const section = (title, items, collapsed = false) => {
            const chevron = collapsed ? '&#9658;' : '&#9660;';
            return `<div class="section-wrapper">` +
                `<div class="section-label"><span class="section-chevron">${chevron}</span>${escapeHtml(title)}</div>` +
                `<div class="section-items" data-collapsed-default="${collapsed}"${collapsed ? ' hidden' : ''}>${items}</div>` +
                `</div>`;
        };
        const varItem = (v) => {
            const eName = escapeHtml(v.name);
            const pasteVal = v.dynamic ? `$${eName}` : escapeHtml(v.value);
            const valueSpan = v.dynamic
                ? `<span class="item-value dynamic">&#9888; dynamic</span>`
                : `<span class="item-value">${escapeHtml(v.value)}</span>`;
            const et = v.dynamic ? eName : escapeHtml(v.name + '|' + v.value);
            return `<div class="item" data-value="${pasteVal}" data-search-terms="${et}">` +
                `<div class="item-body">` +
                `<span class="item-label">${eName}</span>` +
                valueSpan +
                `</div>` +
                `<button class="copy-btn" data-value="${pasteVal}">Copy</button>` +
                `</div>`;
        };
        const envVarItem = (v) => {
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
        const bashVars = config.sources.bash ? (0, bashReader_1.readBashVars)() : [];
        const bashSection = bashVars.length > 0
            ? section('Bash Variables', bashVars.map(varItem).join(''), collapsedSet.has('bash'))
            : '';
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const docResults = workspaceRoot && config.sources.runbooks.length > 0
            ? (0, docReader_1.readDocSources)(config.sources.runbooks, workspaceRoot)
            : [];
        const renderBlock = (b) => {
            const eLabel = escapeHtml(b.label);
            const eRel = escapeHtml(b.relPath);
            const eAbs = escapeHtml(b.absPath);
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
        const docItems = docResults.flatMap(sr => sr.error
            ? [`<div class="source-error">&#9888; ${escapeHtml(sr.sourcePath)} — ${escapeHtml(sr.error)}</div>`]
            : sr.blocks.map(renderBlock));
        const runbooksSection = docItems.length > 0
            ? section('Runbooks', docItems.join(''), collapsedSet.has('runbooks'))
            : '';
        const envVars = [];
        if (workspaceRoot) {
            for (const rel of config.sources.env) {
                envVars.push(...(0, bashReader_1.readEnvFile)(path.join(workspaceRoot, rel), path.basename(rel)));
            }
        }
        const envSection = envVars.length > 0
            ? section('.env Variables', envVars.map(envVarItem).join(''), collapsedSet.has('env'))
            : '';
        const awsProfiles = config.sources.aws ? (0, awsReader_1.readAwsProfiles)() : [];
        const awsProfileItem = (p) => {
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
exports.NearVarPanel = NearVarPanel;
//# sourceMappingURL=panel.js.map