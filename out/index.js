"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
function activate(context) {
    console.log('Congratulations, your extension "aflat" is now active!');
    vscode.window.showInformationMessage('Hello World!');
    context.subscriptions.push(vscode.commands.registerCommand('aflat.sayHello', () => {
        vscode.window.showInformationMessage('Hello World!');
    }));
    context.subscriptions.push(vscode.languages.registerHoverProvider('aflat', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);
            return new vscode.Hover(`Hello ${word}`);
        }
    }));
}
exports.activate = activate;
;
function deactivate() { }
exports.deactivate = deactivate;
;
