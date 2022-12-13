import { Signature, Symbol, Type } from './Parser'
import * as vscode from 'vscode';

export interface LanguageData {
    data?: Signature | Signature[] | Symbol[] | string;
    error?: string; 
};



/*
 * Extracts the function signature with a given name from some text.
 */
const extractFunction = (text: string, name: string, moduleName: string, exportsOnly?: boolean): LanguageData =>{
    const lines = text.split('\n');
    let curlyCount = 0;
    
    for (const line of lines) {
        if (line.indexOf(name) !== -1 && curlyCount === 0) {
            // check the word before the line for the return type
            const returnType = line.substring(0, line.indexOf(name)).trim().split(' ').pop();
            const beforeReturn = line.substring(0, line.indexOf(name)).trim();
            
            if (exportsOnly && beforeReturn.indexOf('export') === -1 ||
             beforeReturn.indexOf('private') !== -1) {
                continue;
            };
            
            const argList = line.substring(line.indexOf('(') + 1, line.indexOf(')'));
            const args: string[] = argList.split(',');

            args.forEach((arg, i) => {
                args[i] = arg.trim();
            });
            
            // check the previous lines for docstrings
            let docstring = '';
            if (lines.indexOf(line) > 0) {
                const prev = lines[lines.indexOf(line) - 1];
                if (prev.endsWith('*/')) {
                    for (let i = lines.indexOf(line) - 2; i >= 0; i--) {
                        const prev = lines[i];
                        if (prev.startsWith('/*')) {
                            docstring = prev.substring(prev.indexOf('/*') + 2) + docstring;
                        } else {
                            break;
                        }
                    }
                }
            };

            const markdownString = docstring !== '' ? new vscode.MarkdownString(docstring) : undefined;

            const signature: Signature = {
                ident: name,
                returnType: returnType,
                params: args,
                doc: markdownString,
                moduleName: moduleName,
            };
            return {data: signature};
        };

        curlyCount += (line.match(/{/g) || []).length;
        curlyCount -= (line.match(/}/g) || []).length;
    };
    return {error: `Function ${name} not found`};
};

/*
 * Extracts the full text of a given class from some text.
 */
const extractClassText = (text: string, name: string): LanguageData => {
    const lines = text.split('\n');
    let curlyCount = 0;
    let classText = '';
    
    let started = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!started && line.indexOf(name) !== -1 && curlyCount === 0) {
            // check the word before the line for 'class'
            const beforeClass = line.substring(0, line.indexOf(name)).trim();
            if (beforeClass !== 'class') {
                continue;
            };
            started = true;
            classText += line + '\n';
            curlyCount += (line.match(/{/g) || []).length;
            curlyCount -= (line.match(/}/g) || []).length;
            continue;
        };

        if (started) {
            if (curlyCount === 0) {
                return {data: classText.trim()};
            }
            
            classText += line + '\n';
        };

        curlyCount += (line.match(/{/g) || []).length;
        curlyCount -= (line.match(/}/g) || []).length;
    }

    return {error: `Class ${name} not found`};
};

/*
 * Extracts all of the variable, symbols in some text. ie: ...<access> <type> <symbol>...;
 */
const extractSymbols = (text: string, typeList: Type[]): LanguageData => {
    const lines = text.split('\n');
    const symbols: Symbol[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const words = line.split(' ');
    };

    return {data: symbols};
};

export {extractFunction, extractClassText};