"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const SemanticTokenizer_1 = require("./modules/SemanticTokenizer");
function activate(context) {
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat' }, new SemanticTokenizer_1.DocumentSemanticTokenProvidor(), SemanticTokenizer_1.legend));
}
exports.activate = activate;
;
function deactivate() { }
exports.deactivate = deactivate;
;
