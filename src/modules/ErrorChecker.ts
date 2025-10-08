import { AtomType, atomize } from './Atomizer';
import * as vscode from 'vscode';
import { NameSets } from './Parsing/Parser';

const removeStringsAndComments = (line: string): string => {
    return line
        .replace(/\/\/.*$/, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"([^"\\]|\\.)*"/g, '')
        .replace(/'([^'\\]|\\.)*'/g, '')
        .replace(/`([^`\\]|\\.)*`/g, '');
};

const Keywords = [ 'int', 'adr', 'bool', 'byte', 'char', 'float', 'short', 'long', 'generic'
    , 'if', 'else', 'while', 'for', 'foreach', 'signs', 'return', 'new', 'as', 'needs', 'root',
    'my', 'class', 'struct', 'public', 'private', 'NULL', 'true', 'false', 'contract',
    'import', 'from', 'under', 'export', 'delete', 'const', 'mutable', 'enum', 'let', 'safe', 'dynamic',
    'break', 'continue', 'void', 'any', 'padantic', 'fn', 'Apply', 'transform', 'immutable', 'match',
    'union', 'types', 'Self', "in", "when", "match", "has", "missing", "is", "not"];
const deprecated = ['struct']

export const GetErrors = (doc : vscode.TextDocument, errorList : vscode.DiagnosticCollection, nameSets : NameSets): void => {
    if (nameSets.functionNames.size === 0 && nameSets.variableNames.size === 0 && nameSets.typeNames.size === 0 && nameSets.nameSpaceNames.size === 0) return;
    const result : vscode.Diagnostic[] = [];
    const text = doc.getText();
    const lines = text.split(/\r\n|\r|\n/);
    const varDecl = /(?:public|private|static|const|mutable|safe|dynamic|immutable|padantic)?\s*(?:any|let|int|adr|byte|char|float|bool|short|long|generic|vector)\s*(?:\[\d+\])*\s*(?:::<[^>]+>|<[^>]+>)?\s*([\w\d_]+)\s*=.*/g;
    const varDeclNoValue = /(?:public|private|static|const|mutable|safe|dynamic|immutable|padantic)?\s*(?:any|let|int|adr|byte|char|float|bool|short|long|generic|vector)\s*(?:\[\d+\])*\s*(?:::<[^>]+>|<[^>]+>)?\s+([\w\d_]+)\s*(?:[;\]\),=])/g;
    const foreachDecl = /foreach\s+([\w\d_]+)\s+in/g;
    const scopeStack: Set<string>[] = [new Set()];
    const varsPerLine: Set<string>[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const clean = removeStringsAndComments(line);
        for (const ch of clean) {
            if (ch === '{') {
                scopeStack.push(new Set());
            } else if (ch === '}') {
                if (scopeStack.length > 1) scopeStack.pop();
            }
        }
        let match: RegExpExecArray | null;
        while ((match = varDecl.exec(clean)) !== null) {
            scopeStack[scopeStack.length - 1].add(match[1]);
        }
        varDecl.lastIndex = 0;
        while ((match = varDeclNoValue.exec(clean)) !== null) {
            scopeStack[scopeStack.length - 1].add(match[1]);
        }
        varDeclNoValue.lastIndex = 0;
        while ((match = foreachDecl.exec(clean)) !== null) {
            scopeStack[scopeStack.length - 1].add(match[1]);
        }
        foreachDecl.lastIndex = 0;
        const current = new Set<string>(nameSets.variableNames);
        for (const set of scopeStack) set.forEach(v => current.add(v));
        varsPerLine[i] = current;
    }

    const atomList = atomize(text);
    for (let i = 0; i < atomList.length; i++) {
        const checkAtom = atomList[i];
        if (checkAtom.type === AtomType.LObject) {
            const ident = checkAtom.value;
            const inScope = checkAtom.line < varsPerLine.length ? varsPerLine[checkAtom.line].has(ident) : nameSets.variableNames.has(ident);
            if (!nameSets.typeNames.has(ident) &&
            !nameSets.functionNames.has(ident) &&
            !inScope &&
            !nameSets.nameSpaceNames.has(ident) &&
            deprecated.indexOf(ident) === -1 &&
            Keywords.indexOf(ident) === -1 &&
            ident !== '') {
                const range = new vscode.Range(new vscode.Position(checkAtom.line, checkAtom.column), new vscode.Position(checkAtom.line, checkAtom.column + ident.length));
                const diagnostic = new vscode.Diagnostic(range,
                    `Ident \"${ident}\" is not defined`,
                    vscode.DiagnosticSeverity.Error);
                result.push(diagnostic);
            } else if (deprecated.indexOf(ident) !== -1) {
                const range = new vscode.Range(new vscode.Position(checkAtom.line, checkAtom.column), new vscode.Position(checkAtom.line, checkAtom.column + ident.length));
                const diagnostic = new vscode.Diagnostic(range,
                    `Ident \"${ident}\" is deprecated`,
                    vscode.DiagnosticSeverity.Warning);
                result.push(diagnostic);
            }
        }
    }

    errorList.set(doc.uri, result);
}

export const subscribeToDocumentChanges = (context: vscode.ExtensionContext, Diags: vscode.DiagnosticCollection, names : NameSets): void => {
	if (vscode.window.activeTextEditor) {
		GetErrors(vscode.window.activeTextEditor.document, Diags, names);
	}
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor && editor.document.languageId === 'aflat'){
                names.functionNames.clear();
                names.typeNames.clear();
                names.variableNames.clear();
                names.nameSpaceNames.clear();
				GetErrors(editor.document, Diags, names);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.languageId === 'aflat') GetErrors(e.document, Diags, names);
        })
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => Diags.delete(doc.uri))
	);

}