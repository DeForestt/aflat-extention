import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "aflat" is now active!');
    vscode.window.showInformationMessage('Hello World!');
    context.subscriptions.push(vscode.commands.registerCommand('aflat.sayHello', () => {
        vscode.window.showInformationMessage('Hello World!');
    }));

    context.subscriptions.push( vscode.languages.registerHoverProvider('aflat', {
            provideHover(document, position, token) {
                const range = document.getWordRangeAtPosition(position);
                const word = document.getText(range);
                return new vscode.Hover(`Hello ${word}`);
            }
    }));
};

export function deactivate() {};