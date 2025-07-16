import {NOT_CONNECTING_CHAR_REGEX, CONNECTING_CHAR_REGEX } from './../Constents';
import { Signature, Symbol, Type } from './Parser'
import * as vscode from 'vscode';
import { types } from '@babel/core';

export interface LanguageData {
    data?: Signature | Signature[] | Symbol[] | string;
    error?: string; 
};

const removeDoubleQuotedStrings  = (line: string): string => {
    // Create a regular expression that matches double quoted strings
    const regex = /"([^"]*)"/g;
  
    // Replace all double quoted strings with an empty string
    return line.replace(regex, '');
}

const removeSingleQuotedStrings  = (line: string): string => {
    // Create a regular expression that matches double quoted strings
    const regex = /'([^']*)'/g;

    // Replace all double quoted strings with an empty string
    return line.replace(regex, '');
}
  

/*
 * Extracts the function signature with a given name from some text.
 */
const extractFunction = (text: string, name: string, moduleName: string, exportsOnly?: boolean): LanguageData => {
    text += '\n';
    const lines = text.split('\n');
    let curlyCount = 0;

    const updateCurlyCount = (line: string) => {
        curlyCount += (removeDoubleQuotedStrings(removeSingleQuotedStrings(line)).match(/{/g) || []).length;
        curlyCount -= (removeDoubleQuotedStrings(removeSingleQuotedStrings(line)).match(/}/g) || []).length;
    };
    
    for (const line of lines) {
        if (line.indexOf(name) !== -1 && curlyCount === 0) {
            // check that the function name is not part of a larger word
            const nextChar = line.substring(line.indexOf(name) + name.length, line.indexOf(name) + name.length + 1);
            const lastChar = line.substring(line.indexOf(name) - 1, line.indexOf(name));
            if (nextChar.match(CONNECTING_CHAR_REGEX) ||
             lastChar.match(CONNECTING_CHAR_REGEX)) {
                updateCurlyCount(line);
                continue;
             };

            // check the word before the line for the return type
            const returnType = line.substring(0, line.indexOf(name)).trim().split(' ').pop();
            const beforeReturn = line.substring(0, line.indexOf(name)).trim();
            
            if (exportsOnly && beforeReturn.indexOf('export') === -1 ||
             beforeReturn.indexOf('private') !== -1) {
                updateCurlyCount(line);
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

        updateCurlyCount(line);
    };
    return {error: `Function ${name} not found`};
};

/*
 * Extracts the full text of a given class from some text.
 */
const extractClassText = (text: string, name: string): LanguageData => {
    text += '\n';
    const lines = text.split('\n');
    let curlyCount = 0;
    let classText = '';
    
    const updateCurlyCount = (line: string) => {
        curlyCount += (removeDoubleQuotedStrings(removeSingleQuotedStrings(line)).match(/{/g) || []).length;
        curlyCount -= (removeDoubleQuotedStrings(removeSingleQuotedStrings(line)).match(/}/g) || []).length;
    };

    let started = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!started && line.indexOf(name) !== -1 && curlyCount === 0) {
            // check the word before the line for 'class'
            const beforeClass = line.substring(0, line.indexOf(name)).trim().split(' ').pop();
            if (beforeClass !== 'class' && beforeClass !== 'enum' && beforeClass !== 'transform' && beforeClass !== 'union') {
                updateCurlyCount(line);
                continue;
            };
            started = true;
            classText += line + '\n';
            updateCurlyCount(line);
            continue;
        };

        if (started) {
            if (curlyCount === 0) {
                return {data: classText.trim()};
            }
            
            classText += line + '\n';
        };

        updateCurlyCount(line);
    }

    return {error: `Class ${name} not found`};
};

/*
 * Extracts all of the variable, symbols in some text. ie: ...<access> <type> <symbol>...;
 */
const extractSymbols = (text: string, typeList: Type[]): LanguageData => {
    text += '\n';
    const lines = text.split('\n');
    const symbols: Symbol[] = [];
    let curlyCount = 0;
    let perentCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // split the line by non-alphanumeric characters
        perentCount += (line.match(/\(/g) || []).length;
        typeList.forEach(type => {
            // find every instance of the type in the line
            let index = line.indexOf(type.ident);
            while (index !== -1) {
                // check the word before the type for the access
                const beforeType = line.substring(0, line.indexOf(type.ident)).trim();
                if (beforeType.trim() !== '') {
                    const access = beforeType.split(NOT_CONNECTING_CHAR_REGEX).pop();
                    if (access === 'private') {
                        index = line.indexOf(type.ident, index + 1);
                        continue;
                    };
                };

                const afterType = line.substring(index + type.ident.length).trim();

                // check the word after the type for the symbol
                const symbol = afterType.split(NOT_CONNECTING_CHAR_REGEX)[0];
                // check that everything before the symbol is whitespace
                const beforeSymbol = afterType.substring(0, afterType.indexOf(symbol)).trim();
                if (beforeSymbol !== '') {
                    index = line.indexOf(type.ident, index + 1);
                    continue;
                };
                if (!symbol) {
                    index = line.indexOf(type.ident, index + 1);
                    continue;
                };
                if (curlyCount > 0 || perentCount > 0) {
                    index = line.indexOf(type.ident, index + 1);
                    continue;
                }

                symbols.push({
                    ident: symbol,
                    type: type,
                });
                index = line.indexOf(type.ident, index + 1);
            };
            perentCount -= (line.match(/\)/g) || []).length;
        });

        curlyCount += (line.match(/{/g) || []).length;
        curlyCount -= (line.match(/}/g) || []).length;
    };

    return {data: symbols};
};

/*
 * Extracts all of the functions in some text.
 * ie: ...<access> <returnType> <functionName>(<args>)...;
 */
const extractFunctions = (text: string, moduleName: string, exportsOnly?: boolean): LanguageData => {
    text += '\n';
    const lines = text.split('\n');
    const functions: Signature[] = [];
    let curlyCount = 0;

    for (const line of lines) {
        if (line.indexOf('(') === -1) {
            continue;
        };

        const beforeOpenParen = line.substring(0, line.indexOf('(')).trim();
        const name = beforeOpenParen.split(NOT_CONNECTING_CHAR_REGEX).pop();
        if (!name) {
            continue;
        };
        const beforeName = beforeOpenParen.substring(0, beforeOpenParen.indexOf(name)).trim();
        const words = beforeName.split(NOT_CONNECTING_CHAR_REGEX);
        if (words.length === 0) {
            continue;
        };
        const returnType = words.pop();
        if (!returnType) {
            continue;
        }
        const access = words.pop();
        if (exportsOnly && access !== 'export') {
            continue;
        }
        if (access === 'private') {
            continue;
        }

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

        functions.push({
            ident: name,
            moduleName: moduleName,
            returnType: returnType,
            params: args,
            doc: markdownString,
        });
    };

    return {data: functions};
};

const typeFromEnum = (name: string, text: string): Type => {
    // get everything between the first and last curly braces
    const useText = text.substring(text.indexOf('{') + 1, text.lastIndexOf('}'));
    // remove all whitespace
    const noWhitespace = useText.replace(/\s/g, '');
    // split by commas
    const values = noWhitespace.split(',');
    const symbols: Symbol[] = values.map(value => {
        return {
            ident: value,
            type: {
                ident: name,
                functions: [],
                symbols: [],
            },
        };
    });
    return {
        ident: name,
        functions: [],
        symbols: symbols,
    };
};

const typeFromUnion = (name: string, text: string): Type => {
    const body = text.substring(text.indexOf('{') + 1, text.lastIndexOf('}'));
    const lines = body.split(/\r?\n/);
    const variantLines: string[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('fn') || trimmed.includes(' fn ')) {
            break;
        }
        if (trimmed === '') continue;
        variantLines.push(trimmed);
        if (trimmed.includes('fn')) break; // just in case
    }
    const variantText = variantLines.join(' ');
    const variantValues = variantText.split(',');
    const symbols: Symbol[] = variantValues.map(v => {
        const clean = v.split(/[(<]/)[0].trim();
        return {
            ident: clean,
            type: { ident: name, functions: [], symbols: [] },
        };
    }).filter(s => s.ident !== '');

    const functions = extractFunctions(body, name).data as Signature[];

    return { ident: name, functions, symbols };
};

/*
 * Creates a type from a class name and a text string.
 */
const createTypeFromClass = (name: string, text: string, typeList: Type[]): Type => {
    const types = typeList.concat([{
        ident: name,
        functions: [],
        symbols: [],
    }]);

    const trimmed = text.trim();
    if (trimmed.startsWith('enum')) {
        return typeFromEnum(name, text);
    } else if (trimmed.startsWith('union')) {
        return typeFromUnion(name, text);
    }

    // remove the first and last curly braces
    const useText = text.substring(text.indexOf('{') + 1, text.lastIndexOf('}'));

    const functions = extractFunctions(useText, name).data as Signature[];
    const symbols = extractSymbols(useText, types).data as Symbol[];
    return {
        ident: name,
        functions: functions,
        symbols: symbols,
    }
};

export {extractFunction, extractClassText, extractSymbols, extractFunctions, createTypeFromClass};