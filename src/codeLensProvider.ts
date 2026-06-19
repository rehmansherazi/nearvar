import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
import { loadConfig, RunbookEntry } from './configReader';
import { parseBlocks } from './docReader';

function isFileInSource(filePath: string, entry: RunbookEntry, workspaceRoot: string): boolean {
    const abs = path.normalize(
        path.isAbsolute(entry.path) ? entry.path : path.join(workspaceRoot, entry.path)
    );
    let stat: fs.Stats | undefined;
    try { stat = fs.statSync(abs); } catch { return false; }

    if (stat.isFile()) {
        return abs === filePath;
    }
    if (stat.isDirectory()) {
        if (!filePath.startsWith(abs + path.sep)) { return false; }
        if (!filePath.endsWith('.md')) { return false; }
        const relPath = path.relative(abs, filePath);
        if (!entry.recursive && relPath.includes(path.sep)) { return false; }
        if (entry.exclude.some(pattern => minimatch(relPath, pattern))) { return false; }
        return true;
    }
    return false;
}

export class NearVarCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) { return []; }
        const workspaceRoot = folders[0].uri.fsPath;
        const configPath = path.join(workspaceRoot, 'nearvar.yaml');

        const result = loadConfig(configPath);
        if (!result.ok) { return []; }

        const filePath = document.uri.fsPath;
        const inSource = result.config.sources.runbooks.some(
            entry => isFileInSource(filePath, entry, workspaceRoot)
        );
        if (!inSource) { return []; }

        const blocks = parseBlocks(document.getText(), '', filePath);
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
