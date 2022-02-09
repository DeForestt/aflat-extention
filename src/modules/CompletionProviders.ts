import * as vscode from 'vscode';
import { getSymbols } from './ParseAflat';

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
    "private",
    "class",
]

const keywords : vscode.Disposable = vscode.languages.registerCompletionItemProvider('aflat', {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        // Get the word at the current position
        const word = document.getText(document.getWordRangeAtPosition(position));

        // Return the completion item
        return reservedWords.map(x => new vscode.CompletionItem(x));
    }
});

const symbols : vscode.Disposable = vscode.languages.registerCompletionItemProvider('aflat', {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        
        // parse the document
        const documentText = document.getText();
        const symbols = getSymbols(documentText);
        
        return symbols.map(x => new vscode.CompletionItem(x));
    }
    // scroll through all of the text in the document

})

export const providers : vscode.Disposable[] = [
   keywords, symbols
];