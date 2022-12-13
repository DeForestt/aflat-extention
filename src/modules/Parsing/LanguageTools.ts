import { Signature } from './Parser'
import * as vscode from 'vscode';

type LanguageError = {
    message: string;
};



/*
 * Extracts the function signature with a given name from a module.
 */
const extractFunction = (text: string, name: string, moduleName: string): Signature | LanguageError =>{
    const lines = text.split('\n');
    let curlyCount = 0;
    
    for (const line of lines) {
        if (line.indexOf(name) !== -1 && curlyCount === 0) {
            // check the word before the line for the return type
            const words = line.split(' ');
            const returnType = words[words.indexOf(name) - 1];
            const argList = line.substring(line.indexOf('(') + 1, line.indexOf(')'));
            const args = argList.split(',');
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
        };
    };
    return {message: `Function ${name} not found`};
};

export {extractFunction};