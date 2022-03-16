import * as vscode from 'vscode';
import { legend, DocumentSemanticTokenProvidor } from './modules/SemanticTokenizer';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat'}, new DocumentSemanticTokenProvidor(), legend));
};

export function deactivate() {};

