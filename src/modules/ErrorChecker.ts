import { Atom, AtomType, atomize } from './Atomizer';
import * as vscode from 'vscode';
import { NameSets } from './Parser';

const Keywords = [ 'int', 'adr', 'bool', 'byte', 'char', 'float', 'short', 'long'
    , 'if', 'else', 'while', 'for', 'signs', 'return', 'new', 'as', 'needs', 'root',
    'my', 'class', 'struct', 'public', 'private', 'NULL', 'true', 'false']

export const GetErrors = (doc : vscode.TextDocument, errorList : vscode.DiagnosticCollection, nameSets : NameSets): void => {
    if (nameSets.functionNames.size === 0 && nameSets.variableNames.size === 0 && nameSets.typeNames.size === 0) return;
    const result : vscode.Diagnostic[] = [];
    const text = doc.getText();
    const atomList = atomize(text);
    for (let i = 0; i < atomList.length; i++) {
        const checkAtom = atomList[i];
        if (checkAtom.type === AtomType.LObject) {
            const ident = checkAtom.value;
            if (!nameSets.typeNames.has(ident) && 
            !nameSets.functionNames.has(ident) && 
            !nameSets.variableNames.has(ident) && 
            Keywords.indexOf(ident) === -1 &&
            ident !== '') {
                const range = new vscode.Range(new vscode.Position(checkAtom.line, checkAtom.column), new vscode.Position(checkAtom.line, checkAtom.column + ident.length));
                const diagnostic = new vscode.Diagnostic(range,
                    `Ident \"${ident}\" is not defined`,
                    vscode.DiagnosticSeverity.Error);
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
			if (editor) {
                names.functionNames.clear();
                names.typeNames.clear();
                names.variableNames.clear();
				GetErrors(editor.document, Diags, names);
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(e => GetErrors(e.document, Diags, names))
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument(doc => Diags.delete(doc.uri))
	);

}