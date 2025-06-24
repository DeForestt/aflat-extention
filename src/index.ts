import { NameSets } from './modules/Parsing/Parser';
import * as vscode from 'vscode';
import { legend, DocumentSemanticTokenProvidor} from './modules/SemanticTokenizer';
import { subscribeToDocumentChanges } from './modules/ErrorChecker';
import { AflatSignatureHelpProvider } from './modules/SignatureHelpProvider';
import { AflatCompletionProvider } from './modules/CompletionProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "aflat" is now active!');
        const names : NameSets = {
                typeNames: new Set(),
                functionNames: new Set(),
                variableNames: new Set(),
                variableTypes: new Map(),
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
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: 'aflat' }, new AflatCompletionProvider(), '.', '"', '<'));
        subscribeToDocumentChanges(context, ErrorDiagnostics, names);

	// provide a run command that runs `aflat run` in a temporary terminal
	context.subscriptions.push(vscode.commands.registerCommand('aflat.run', () => {
		const terminal = vscode.window.createTerminal('aflat');
		terminal.sendText('aflat run');
		terminal.show();
	}));


	// provide a build command that runs `aflat build` in the terminal
	context.subscriptions.push(vscode.commands.registerCommand('aflat.build', () => {
		const terminal = vscode.window.createTerminal('aflat');
		terminal.sendText('aflat build');
		terminal.show();
	}));
	
	// provide a test command that runs `aflat test` in a temporary terminal
	context.subscriptions.push(vscode.commands.registerCommand('aflat.test', () => {
		const terminal = vscode.window.createTerminal('aflat');
		terminal.sendText('aflat test');
		terminal.show();
	}));
};

export function deactivate() {};

