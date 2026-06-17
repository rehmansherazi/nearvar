import * as vscode from 'vscode';
import { NearVarPanel } from './panel';

export function activate(context: vscode.ExtensionContext): void {
    const provider = new NearVarPanel(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(NearVarPanel.viewType, provider)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('nearvar.openPanel', () => {
            void vscode.commands.executeCommand('nearvar.panel.focus');
        })
    );
}

export function deactivate(): void {}
