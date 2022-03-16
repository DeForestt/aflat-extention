import * as vscode from 'vscode';
import { legend, DocumentSemanticTokenProvidor} from './modules/SemanticTokenizer';

export function activate(context: vscode.ExtensionContext) {
	const TokenDiagnositcs : vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('SemanticTokenizer');
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat'}, new DocumentSemanticTokenProvidor(TokenDiagnositcs), legend));
	context.subscriptions.push(TokenDiagnositcs);
};

export function deactivate() {};

