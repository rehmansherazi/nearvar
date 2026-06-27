import * as vscode from 'vscode';
import { NearVarPanel } from './panel';
import { NearVarCodeLensProvider } from './codeLensProvider';

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
    context.subscriptions.push(
        vscode.commands.registerCommand('nearvar.pasteToTerminal', (value: string) => {
            const terminal = vscode.window.activeTerminal;
            if (terminal) {
                terminal.show();
                terminal.sendText(value, false);
            } else {
                const newTerminal = vscode.window.createTerminal('NearVar');
                newTerminal.show();
                setTimeout(() => newTerminal.sendText(value, false), 500);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('nearvar.switchFolder', () => {
            void provider.switchFolder();
        })
    );
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { scheme: 'file', language: 'markdown' },
            new NearVarCodeLensProvider()
        )
    );
}

export function deactivate(): void {}
