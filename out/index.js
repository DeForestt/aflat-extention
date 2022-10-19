"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const SemanticTokenizer_1 = require("./modules/SemanticTokenizer");
const ErrorChecker_1 = require("./modules/ErrorChecker");
const SignatureHelpProvider_1 = require("./modules/SignatureHelpProvider");
function activate(context) {
    const names = {
        typeNames: new Set(),
        functionNames: new Set(),
        variableNames: new Set(),
        nameSpaceNames: new Set(),
        functionSignatures: new Set()
    };
    const TokenDiagnositcs = vscode.languages.createDiagnosticCollection('SemanticTokenizer');
    const ErrorDiagnostics = vscode.languages.createDiagnosticCollection('ErrorChecker');
    const SignatureHelp = new vscode.SignatureHelp();
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat' }, new SemanticTokenizer_1.DocumentSemanticTokenProvidor(TokenDiagnositcs, names), SemanticTokenizer_1.legend));
    context.subscriptions.push(TokenDiagnositcs);
    context.subscriptions.push(ErrorDiagnostics);
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider({ language: 'aflat' }, new SignatureHelpProvider_1.AflatSignatureHelpProvider(names), '(', ','));
    (0, ErrorChecker_1.subscribeToDocumentChanges)(context, ErrorDiagnostics, names);
}
exports.activate = activate;
;
function deactivate() { }
exports.deactivate = deactivate;
;
//# sourceMappingURL=index.js.map