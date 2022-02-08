import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "aflat" is now active!');
    vscode.window.showInformationMessage('Hello World!');
    context.subscriptions.push(vscode.commands.registerCommand('extension.sayHello', () => {
        vscode.window.showInformationMessage('Hello World!');
    }));
};

export function deactivate() {};