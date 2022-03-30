"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const SemanticTokenizer_1 = require("./modules/SemanticTokenizer");
const ErrorChecker_1 = require("./modules/ErrorChecker");
function activate(context) {
    const names = {
        typeNames: new Set(),
        functionNames: new Set(),
        variableNames: new Set(),
        nameSpaceNames: new Set()
    };
    const TokenDiagnositcs = vscode.languages.createDiagnosticCollection('SemanticTokenizer');
    const ErrorDiagnostics = vscode.languages.createDiagnosticCollection('ErrorChecker');
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat' }, new SemanticTokenizer_1.DocumentSemanticTokenProvidor(TokenDiagnositcs, names), SemanticTokenizer_1.legend));
    context.subscriptions.push(TokenDiagnositcs);
    context.subscriptions.push(ErrorDiagnostics);
    ErrorChecker_1.subscribeToDocumentChanges(context, ErrorDiagnostics, names);
}
exports.activate = activate;
;
function deactivate() { }
exports.deactivate = deactivate;
;
