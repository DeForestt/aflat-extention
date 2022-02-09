import * as vscode from 'vscode';

const reservedWords : string[] = [
    "int",
    "float",
    "adr",
    "short",
    "return",
    "as",
    "if",
    "else",
    "while",
    "for",
    "public",
    "private"
]

const keywords : vscode.Disposable = vscode.languages.registerCompletionItemProvider('aflat', {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        // Get the word at the current position
        const word = document.getText(document.getWordRangeAtPosition(position));

        // Return the completion item
        return reservedWords.map(x => new vscode.CompletionItem(x));
    }
});

export const providers : vscode.Disposable[] = [
   keywords
];