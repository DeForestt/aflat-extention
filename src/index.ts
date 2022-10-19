import { NameSets } from './modules/Parser';
import * as vscode from 'vscode';
import { legend, DocumentSemanticTokenProvidor} from './modules/SemanticTokenizer';
import { subscribeToDocumentChanges } from './modules/ErrorChecker';
import { AflatSignatureHelpProvider } from './modules/SignatureHelpProvider';

export function activate(context: vscode.ExtensionContext) {
	const names : NameSets = {
		typeNames: new Set(),
		functionNames: new Set(),
		variableNames: new Set(),
		nameSpaceNames: new Set(),
		functionSignatures: new Set()
	};
	const TokenDiagnositcs : vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('SemanticTokenizer');
	const ErrorDiagnostics : vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('ErrorChecker');
	const SignatureHelp : vscode.SignatureHelp = new vscode.SignatureHelp();

	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat'}, new DocumentSemanticTokenProvidor(TokenDiagnositcs, names), legend));
	context.subscriptions.push(TokenDiagnositcs);
	context.subscriptions.push(ErrorDiagnostics);
	context.subscriptions.push(vscode.languages.registerSignatureHelpProvider({ language: 'aflat'}, new AflatSignatureHelpProvider(names), '(', ','));
	subscribeToDocumentChanges(context, ErrorDiagnostics, names);
};

export function deactivate() {};

