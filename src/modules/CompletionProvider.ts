import * as vscode from 'vscode';
import getSets, { NameSets } from './Parsing/Parser';

function cleanLine(line: string): string {
    return line
        .replace(/\/\/.*$/, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"([^"\\]|\\.)*"/g, '')
        .replace(/'([^'\\]|\\.)*'/g, '')
        .replace(/`([^`\\]|\\.)*`/g, '');
}

function variablesInScope(lines: string[], lineNumber: number): Set<string> {
    const scopeStack: Set<string>[] = [new Set()];
    const varDecl = /(?:any|let|int|adr|byte|char|float|bool|short|long|generic)\s*(?:\[\d+\])*\s*(?:<.*>)?\s*([\w\d_]+)\s*=.*/g;
    const varDeclNoValue = /(?:any|let|int|adr|byte|char|float|bool|short|long|generic)\s*(?:\[\d+\])*\s*(?:<.*>)?\s+([\w\d_]+)\s*(?:[;\]\),=])/g;
    const customDecl = /([\w\d_]+)(?:\s*::\s*<[^>]+>|<[^>]+>)?\s+([\w\d_]+)\s*(?:[=;\]\),])/g;

    for (let i = 0; i <= lineNumber; i++) {
        const line = cleanLine(lines[i]);
        let match: RegExpExecArray | null;
        while ((match = varDecl.exec(line)) !== null) {
            scopeStack[scopeStack.length - 1].add(match[1]);
        }
        varDecl.lastIndex = 0;
        while ((match = varDeclNoValue.exec(line)) !== null) {
            scopeStack[scopeStack.length - 1].add(match[1]);
        }
        varDeclNoValue.lastIndex = 0;
        while ((match = customDecl.exec(line)) !== null) {
            scopeStack[scopeStack.length - 1].add(match[2]);
        }
        customDecl.lastIndex = 0;
        for (const ch of line) {
            if (ch === '{') {
                scopeStack.push(new Set());
            } else if (ch === '}') {
                if (scopeStack.length > 1) scopeStack.pop();
            }
        }
    }

    const result = new Set<string>();
    for (const set of scopeStack) {
        set.forEach(v => result.add(v));
    }
    return result;
}

export class AflatCompletionProvider implements vscode.CompletionItemProvider {
    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[]> {
        const text = document.getText();
        const names: NameSets = await getSets(text, new Set(), 'main', vscode.workspace.asRelativePath(document.uri, false));
        const lines = text.split(/\r\n|\r|\n/);
        const vars = variablesInScope(lines, position.line);

        const items: vscode.CompletionItem[] = [];
        vars.forEach(v => {
            items.push(new vscode.CompletionItem(v, vscode.CompletionItemKind.Variable));
        });
        names.functionNames.forEach(fn => {
            items.push(new vscode.CompletionItem(fn, vscode.CompletionItemKind.Function));
        });
        names.typeNames.forEach(t => {
            items.push(new vscode.CompletionItem(t, vscode.CompletionItemKind.Class));
        });
        names.nameSpaceNames.forEach(ns => {
            items.push(new vscode.CompletionItem(ns, vscode.CompletionItemKind.Module));
        });

        return items;
    }
}

