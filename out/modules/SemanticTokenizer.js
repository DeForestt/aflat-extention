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
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const Parser_1 = require("./Parser");
const tokenTypes = new Map();
const tokenModifiers = new Map();
exports.legend = (function () {
    const tokenTypesLegend = [
        'variable', 'class', 'function', 'string', 'error', 'namespace'
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
    constructor(TokenDiagnostics, NameSets) {
        this.diagnosticList = [];
        this.TokenDiagnositcs = TokenDiagnostics;
        this.NameSets = NameSets;
        TokenDiagnostics.clear();
    }
    provideDocumentSemanticTokens(document, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const allTokens = yield this._parseText(document.getText());
            const builder = new vscode.SemanticTokensBuilder();
            allTokens.forEach((token) => {
                builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
            });
            // set the diagnostics
            this.TokenDiagnositcs.set(document.uri, this.diagnosticList);
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
            this.diagnosticList = [];
            const prelines = text.split(/\r\n|\r|\n/);
            const names = yield Parser_1.default(text, new Set());
            let typeNames = names.typeNames;
            let functionNames = names.functionNames;
            let variableNames = names.variableNames;
            let nameSpaceNames = names.nameSpaceNames;
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
                        if (fs.existsSync(uri)) {
                        }
                        else {
                            // add Diagnostic
                            let diag = new vscode.Diagnostic(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, prelines[i].length)), `${uri} does not exist`, vscode.DiagnosticSeverity.Error);
                            this.diagnosticList.push(diag);
                        }
                    }
                    else {
                        vscode.window.showErrorMessage('No workspace found');
                    }
                }
                if (prelines[i].trim().startsWith("import")) {
                    const needsDir = prelines[i].substring(prelines[i].indexOf('\"') + 1, prelines[i].lastIndexOf('\"'));
                    const work = vscode.workspace.workspaceFolders;
                    if (work !== undefined) {
                        const cwd = work[0].uri.fsPath;
                        let uri = path.join(cwd, rootDir, needsDir);
                        if (!needsDir.startsWith('.')) {
                            // add the std lib
                            const config = vscode.workspace.getConfiguration('aflat');
                            const libPath = config.get('stddir');
                            if (typeof libPath === 'string') {
                                uri = path.join(libPath.replace('head', 'src'), needsDir);
                            }
                        }
                        if (!needsDir.endsWith('.af'))
                            uri = uri + '.af';
                        if (fs.existsSync(uri)) {
                        }
                        else {
                            let diag = new vscode.Diagnostic(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, prelines[i].length)), `${uri} does not exist`, vscode.DiagnosticSeverity.Error);
                            this.diagnosticList.push(diag);
                        }
                    }
                    else {
                        vscode.window.showErrorMessage('No workspace found');
                    }
                }
                ;
                // match .needs <dir>
                const needsDirMatch2 = prelines[i].match(/.needs\s+<([^>]+)>/);
                if (needsDirMatch2) {
                    // read libpath from .vscode/settings.json
                    if (vscode.workspace.workspaceFolders !== undefined) {
                        const config = vscode.workspace.getConfiguration('aflat');
                        const libPath = config.get('stddir');
                        //console.log(libPath);
                        if (typeof libPath === 'string') {
                            const needsDir = (needsDirMatch2[1].endsWith('.gs')) ? needsDirMatch2[1] : needsDirMatch2[1] + '.gs';
                            const uri = path.join(libPath, needsDir);
                            // check if file exists
                            if (fs.existsSync(uri)) {
                            }
                            else {
                                vscode.window.showErrorMessage('File not found: ' + uri);
                                //add error token
                                let diag = new vscode.Diagnostic(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, prelines[i].length)), `${uri} does not exist`, vscode.DiagnosticSeverity.Error);
                                this.diagnosticList.push(diag);
                            }
                        }
                    }
                    else {
                        vscode.window.showErrorMessage('No workspace found');
                    }
                }
            }
            const myNames = yield Parser_1.default(text, new Set());
            typeNames = new Set([...typeNames, ...myNames.typeNames]);
            functionNames = new Set([...functionNames, ...myNames.functionNames]);
            variableNames = new Set([...variableNames, ...myNames.variableNames]);
            nameSpaceNames = new Set([...nameSpaceNames, ...myNames.nameSpaceNames]);
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const stringRanges = new Set();
                // sliding window to find all double quoted strings
                for (let j = 0; j < line.length; j++) {
                    if (line[j] === '\"') {
                        let start = j;
                        let end = j + 1;
                        while ((line[end] !== '\"' || line[end - 1] === '\\') && end < line.length) {
                            end++;
                        }
                        stringRanges.add({ start: start, end: end + 1 });
                        j = end + 1;
                    }
                }
                // check for <>
                for (let j = 0; j < line.length; j++) {
                    if (line[j] === '<') {
                        let start = j;
                        let end = j + 1;
                        while (line[end] !== '>' && end < line.length) {
                            end++;
                        }
                        stringRanges.add({ start: start, end: end + 1 });
                        j = end + 1;
                    }
                }
                // check for single quoted strings
                for (let j = 0; j < line.length; j++) {
                    if (line[j] === '\'') {
                        let start = j;
                        let end = j + 1;
                        while ((line[end] !== '\'' || line[end - 1] === '\\') && end < line.length) {
                            end++;
                        }
                        stringRanges.add({ start: start, end: end + 1 });
                        j = end + 1;
                    }
                }
                // check for // comments
                const commentMatch = line.match(/\/\/(.*)/);
                if (commentMatch) {
                    stringRanges.add({
                        start: line.indexOf(commentMatch[1]),
                        end: line.length - 1
                    });
                }
                ;
                // check for /* comments
                const commentMatch2 = line.match(/\/\*(.*)\*\//);
                if (commentMatch2) {
                    stringRanges.add({
                        start: line.indexOf(commentMatch2[1]),
                        end: line.indexOf(commentMatch2[1]) + commentMatch2[1].length
                    });
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
                                    for (const range of stringRanges) {
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
                                    for (const range of stringRanges) {
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
                                    for (const range of stringRanges) {
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
                // search for namespaces
                for (let word of nameSpaceNames) {
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
                                    for (const range of stringRanges) {
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
                                            tokenType: 'namespace',
                                            tokenModifiers: []
                                        });
                                }
                            }
                        }
                        start++;
                        end++;
                    }
                }
            }
            this.NameSets.functionNames = functionNames;
            this.NameSets.variableNames = variableNames;
            this.NameSets.typeNames = typeNames;
            this.NameSets.nameSpaceNames = nameSpaceNames;
            return r;
        });
    }
}
exports.DocumentSemanticTokenProvidor = DocumentSemanticTokenProvidor;
//# sourceMappingURL=SemanticTokenizer.js.map