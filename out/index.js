"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSets = exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
const tokenTypes = new Map();
const tokenModifiers = new Map();
const legend = (function () {
    const tokenTypesLegend = [
        'variable', 'class', 'function', 'string'
    ];
    tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));
    const tokenModifiersLegend = [
        'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
        'modification', 'async'
    ];
    tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));
    return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();
class DocumentSemanticTokenProvidor {
    provideDocumentSemanticTokens(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const allTokens = yield this._parseText(document.getText());
            const builder = new vscode.SemanticTokensBuilder();
            allTokens.forEach((token) => {
                builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
            });
            return builder.build();
        });
    }
    _encodeTokenType(tokenType) {
        if (tokenTypes.has(tokenType)) {
            return tokenTypes.get(tokenType);
        }
        return 0;
    }
    _encodeTokenModifiers(strTokenModifiers) {
        let result = 0;
        for (let i = 0; i < strTokenModifiers.length; i++) {
            const tokenModifier = strTokenModifiers[i];
            if (tokenModifiers.has(tokenModifier)) {
                result = result | (1 << tokenModifiers.get(tokenModifier));
            }
            else if (tokenModifier === 'notInLegend') {
                result = result | (1 << tokenModifiers.size + 2);
            }
        }
        return result;
    }
    _parseText(text) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = [];
            const prelines = text.split(/\r\n|\r|\n/);
            const names = getSets(text);
            let typeNames = names.typeNames;
            let functionNames = names.functionNames;
            let variableNames = names.variableNames;
            let rootDir = '';
            let lines = prelines;
            for (let i = 0; i < prelines.length; i++) {
                // match .root "dir"
                const rootDirMatch = prelines[i].match(/.root\s+"([^"]+)"/);
                if (rootDirMatch) {
                    rootDir = rootDirMatch[1];
                    continue;
                }
                // match .needs "dir"
                const needsDirMatch = prelines[i].match(/.needs\s+"([^"]+)"/);
                if (needsDirMatch) {
                    const needsDir = (needsDirMatch[1].endsWith('.gs')) ? needsDirMatch[1] : needsDirMatch[1] + '.gs';
                    // read the file
                    const work = vscode.workspace.workspaceFolders;
                    if (work !== undefined) {
                        const cwd = work[0].uri.fsPath;
                        const uri = path.join(cwd, rootDir, needsDir);
                        const needsFile = yield vscode.workspace.fs.readFile(vscode.Uri.file(uri));
                        const needsNameSets = getSets(needsFile.toString());
                        typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
                        functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
                        variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
                    }
                    else {
                        vscode.window.showErrorMessage('No workspace found');
                    }
                }
                // match .needs <dir>
                const needsDirMatch2 = prelines[i].match(/.needs\s+<([^>]+)>/);
                if (needsDirMatch2) {
                    // read libpath from .vscode/settings.json
                    if (vscode.workspace.workspaceFolders !== undefined) {
                        const config = vscode.workspace.getConfiguration('Aflat', vscode.workspace.workspaceFolders[0].uri);
                        const libPath = '/home/dthompson/Repos/aflat/libraries/std/head';
                        //console.log(libPath);
                        if (typeof libPath === 'string') {
                            const needsDir = (needsDirMatch2[1].endsWith('.gs')) ? needsDirMatch2[1] : needsDirMatch2[1] + '.gs';
                            const uri = path.join(libPath, rootDir, needsDir);
                            const needsFile = yield vscode.workspace.fs.readFile(vscode.Uri.file(path.join(uri)));
                            const needsNameSets = getSets(needsFile.toString());
                            typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
                            functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
                            variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
                        }
                    }
                    else {
                        vscode.window.showErrorMessage('No workspace found');
                    }
                }
            }
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const streingRanges = new Set();
                // check for double quoted strings
                const doubleQuoteMatch = line.match(/"([^"]*)"/);
                if (doubleQuoteMatch) {
                    for (const match of doubleQuoteMatch) {
                        streingRanges.add({
                            start: line.indexOf(match),
                            end: line.indexOf(match) + match.length
                        });
                    }
                    ;
                }
                ;
                // check for <>
                const angleBracketMatch = line.match(/<([^>]*)>/);
                if (angleBracketMatch) {
                    let angleBracketString = angleBracketMatch[1];
                    streingRanges.add({
                        start: line.indexOf(angleBracketString),
                        end: line.indexOf(angleBracketString) + angleBracketString.length
                    });
                }
                // check for single quoted strings
                const singleQuoteMatch = line.match(/'([^']*)'/);
                if (singleQuoteMatch) {
                    let singleQuoteString = singleQuoteMatch[1];
                    streingRanges.add({
                        start: line.indexOf(singleQuoteString),
                        end: line.indexOf(singleQuoteString) + singleQuoteString.length
                    });
                }
                // check for // comments
                const commentMatch = line.match(/\/\/(.*)/);
                if (commentMatch) {
                    streingRanges.add({
                        start: line.indexOf(commentMatch[1]),
                        end: line.length - 1
                    });
                }
                ;
                // check for /* comments
                const commentMatch2 = line.match(/\/\*(.*)\*\//);
                if (commentMatch2) {
                    streingRanges.add({
                        start: line.indexOf(commentMatch2[1]),
                        end: line.indexOf(commentMatch2[1]) + commentMatch2[1].length
                    });
                }
                // search the line for variable declarations with a type
                for (const typeName of typeNames) {
                    const variableDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:[;\\]\\)\\,=])`));
                    if (variableDeclaration) {
                        const variableName = variableDeclaration[1];
                        // add the variable name to list of known variables
                        variableNames.add(variableName);
                    }
                }
                // search the line for function declarations with a type
                for (const typeName of typeNames) {
                    const functionDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*\\(([\\w\\d_\\s,]*)\\)`));
                    if (functionDeclaration) {
                        const functionName = functionDeclaration[1];
                        const functionArguments = functionDeclaration[2].split(',');
                        // add the function name to list of known functions
                        functionNames.add(functionName);
                    }
                }
                // search the line for strings in the variable list
                for (let word of variableNames) {
                    // sliding window search for word
                    let start = 0;
                    let end = word.length;
                    while (end < line.length) {
                        const window = line.substring(start, end);
                        if (window === word) {
                            if (start === 0 || !/[a-zA-Z0-9_]/.test(line[start - 1])) {
                                if (end === line.length || !/[a-zA-Z0-9_]/.test(line[end])) {
                                    // check if the word is in a string
                                    let inString = false;
                                    for (const range of streingRanges) {
                                        if (range.start <= start && range.end >= start) {
                                            inString = true;
                                        }
                                    }
                                    ;
                                    if (!inString)
                                        r.push({
                                            line: i,
                                            startCharacter: start,
                                            length: word.length,
                                            tokenType: 'variable',
                                            tokenModifiers: []
                                        });
                                }
                            }
                        }
                        start++;
                        end++;
                    }
                }
                // search the line for strings in the class list
                for (let word of typeNames) {
                    // sliding window search for word
                    let start = 0;
                    let end = word.length;
                    while (end < line.length) {
                        const window = line.substring(start, end);
                        if (window === word) {
                            if (start === 0 || !/[a-zA-Z0-9_]/.test(line[start - 1])) {
                                if (end === line.length || !/[a-zA-Z0-9_]/.test(line[end])) {
                                    // check if the word is in a string
                                    let inString = false;
                                    for (const range of streingRanges) {
                                        if (range.start <= start && range.end >= start) {
                                            inString = true;
                                        }
                                    }
                                    ;
                                    if (!inString)
                                        r.push({
                                            line: i,
                                            startCharacter: start,
                                            length: word.length,
                                            tokenType: 'class',
                                            tokenModifiers: []
                                        });
                                }
                            }
                        }
                        start++;
                        end++;
                    }
                }
                ;
                // search the line for strings in the function list
                for (let word of functionNames) {
                    // sliding window search for word
                    let start = 0;
                    let end = word.length;
                    while (end < line.length) {
                        const window = line.substring(start, end);
                        if (window === word) {
                            if (start === 0 || !/[a-zA-Z0-9_]/.test(line[start - 1])) {
                                if (end === line.length || !/[a-zA-Z0-9_]/.test(line[end])) {
                                    // check if the word is in a string
                                    let inString = false;
                                    for (const range of streingRanges) {
                                        if (range.start <= start && range.end >= start) {
                                            inString = true;
                                        }
                                    }
                                    ;
                                    if (!inString)
                                        r.push({
                                            line: i,
                                            startCharacter: start,
                                            length: word.length,
                                            tokenType: 'function',
                                            tokenModifiers: []
                                        });
                                }
                            }
                        }
                        start++;
                        end++;
                    }
                }
                ;
            }
            return r;
        });
    }
}
function activate(context) {
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat' }, new DocumentSemanticTokenProvidor(), legend));
}
exports.activate = activate;
;
function deactivate() { }
exports.deactivate = deactivate;
;
function getSets(text) {
    const typeNames = new Set();
    const functionNames = new Set();
    const variableNames = new Set();
    const lines = text.split('\n');
    const prelines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // search the line a variable declaration
        const variableDeclaration = line.match(/(?:int|adr|char|float|bool|short)\s+([\w\d_]+)\s*=\s*(.*)/);
        if (variableDeclaration) {
            const variableName = variableDeclaration[1];
            // add the variable name to list of known variables
            variableNames.add(variableName);
        }
        // match a variable declaration without a value
        const variableDeclarationWithoutValue = line.match(/(?:int|adr|char|float|bool|short)\s+([\w\d_]+)\s*(;|\]|\)|\,)/);
        if (variableDeclarationWithoutValue) {
            const variableName = variableDeclarationWithoutValue[1];
            // add the variable name to list of known variables
            variableNames.add(variableName);
        }
        // search the line a class declaration
        const classDeclaration = line.match(/(?:class)\s+([\w\d_]+)\s*/);
        if (classDeclaration) {
            const className = classDeclaration[1];
            // add the class name to list of known classes
            typeNames.add(className);
        }
        // search the line a function declaration ie int foo(int a, int b)
        const functionDeclaration = line.match(/(?:int|adr|char|float|bool|short)\s+([\w\d_]+)\s*\(([\w\d_\s,]*)\)/);
        if (functionDeclaration) {
            const functionName = functionDeclaration[1];
            const functionArguments = functionDeclaration[2].split(',');
            // add the function name to list of known functions
            functionNames.add(functionName);
        }
        ;
        // search the line for variable declarations with a type
        for (const typeName of typeNames) {
            const variableDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:[;\\]\\)\\,=])`));
            if (variableDeclaration) {
                const variableName = variableDeclaration[1];
                // add the variable name to list of known variables
                variableNames.add(variableName);
            }
        }
        // search the line for function declarations with a type
        for (const typeName of typeNames) {
            const functionDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*\\(([\\w\\d_\\s,]*)\\)`));
            if (functionDeclaration) {
                const functionName = functionDeclaration[1];
                const functionArguments = functionDeclaration[2].split(',');
                // add the function name to list of known functions
                functionNames.add(functionName);
            }
        }
    }
    // return the sets
    return { typeNames, functionNames, variableNames };
}
exports.getSets = getSets;
