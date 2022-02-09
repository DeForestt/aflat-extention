"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providers = void 0;
const vscode = require("vscode");
const reservedWords = [
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
];
const keywords = vscode.languages.registerCompletionItemProvider('aflat', {
    provideCompletionItems(document, position, token, context) {
        // Get the word at the current position
        const word = document.getText(document.getWordRangeAtPosition(position));
        // Return the completion item
        return reservedWords.map(x => new vscode.CompletionItem(x));
    }
});
const functions = vscode.languages.registerCompletionItemProvider('aflat', {
    provideCompletionItems(document, position, token, context) {
        // parse the document
        const documentText = document.getText();
        return [];
    }
    // scroll through all of the text in the document
});
exports.providers = [
    keywords
];
