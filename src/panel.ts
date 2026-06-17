import * as vscode from 'vscode';

export class NearVarPanel implements vscode.WebviewViewProvider {
    static readonly viewType = 'nearvar.panel';

    constructor(private readonly _context: vscode.ExtensionContext) {}

    resolveWebviewView(
        _webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {}
}
