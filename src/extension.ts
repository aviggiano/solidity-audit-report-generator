import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('solidity-audit-report-generator.generateAuditReport', () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            vscode.window.showInformationMessage('No workspace is opened.');
            return;
        }

        const auditComments: string[] = [];

        workspaceFolders.forEach((folder) => {
            const folderPath = folder.uri.fsPath;
            findSolidityFiles(folderPath, auditComments);
        });

        const auditCommentsFilePath = path.join(workspaceFolders[0].uri.fsPath, 'audit_comments.txt');
        fs.writeFileSync(auditCommentsFilePath, auditComments.join('\n'), 'utf8');
        vscode.window.showInformationMessage('Audit comments saved to audit_comments.txt.');
    });

    context.subscriptions.push(disposable);
}

function findSolidityFiles(dirPath: string, auditComments: string[]) {
    fs.readdirSync(dirPath).forEach(file => {
        const filePath = path.join(dirPath, file);

        if (fs.statSync(filePath).isDirectory()) {
            findSolidityFiles(filePath, auditComments);
        } else if (path.extname(file) === '.sol') {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split('\n');
            lines.forEach((line, i) => {
                if (line.trim().startsWith('// @audit')) {
                    auditComments.push(`File: ${file}, Line: ${i + 1}, Comment: ${line.trim()}`);
                }
            });
        }
    });
}

export function deactivate() {}
