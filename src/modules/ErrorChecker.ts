import { Atom, AtomType } from './Atomizer';
import * as vscode from 'vscode';
import { NameSets } from './Parser';

const Keywords = [ 'int', 'adr', 'bool', 'byte', 'char', 'float', 'short', 'long'
    , 'if', 'else', 'while', 'for', 'signs', 'return', 'new', 'as']

const GetErrors = (atomList : Atom[], errorList : vscode.Diagnostic[], nameSets : NameSets) : vscode.Diagnostic[] => {
    const result : vscode.Diagnostic[] = [];
    for (let i = 0; i < atomList.length; i++) {
        const checkAtom = atomList[i];
        if (checkAtom.type === AtomType.LObject) {
            const ident = checkAtom.value;
            if (!nameSets.typeNames.has(ident) && 
            !nameSets.functionNames.has(ident) && 
            !nameSets.variableNames.has(ident) && 
            Keywords.indexOf(ident) === -1) {
                const range = new vscode.Range(new vscode.Position(checkAtom.line, checkAtom.column), new vscode.Position(i, ident.length));
                const diagnostic = new vscode.Diagnostic(range, `Ident ${ident} is not defined`, vscode.DiagnosticSeverity.Error);
                result.push(diagnostic);
            }
        }
    }

    return result;
}