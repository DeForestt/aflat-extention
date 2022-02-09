import * as vscode from 'vscode';
import * as completionProviders from './modules/CompletionProviders';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(...completionProviders.providers);
};

export function deactivate() {};