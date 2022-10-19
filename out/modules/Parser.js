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
const getSets = (text, NameSetsMemo) => __awaiter(void 0, void 0, void 0, function* () {
    let typeNames = new Set();
    let functionNames = new Set();
    let variableNames = new Set();
    let nameSpaceNames = new Set();
    let functionSignatures = new Set();
    const prelines = text.split(/\r\n|\r|\n/);
    let lines = prelines;
    let rootDir = '';
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
                    const needsFile = yield vscode.workspace.fs.readFile(vscode.Uri.file(uri));
                    let needsNameSets = {
                        typeNames: new Set(),
                        functionNames: new Set(),
                        variableNames: new Set(),
                        nameSpaceNames: new Set(),
                    };
                    if (NameSetsMemo.has(uri)) {
                    }
                    else {
                        needsNameSets = yield getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]));
                        typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
                        functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
                        variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
                        nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
                        functionSignatures = new Set([...functionSignatures, ...(needsNameSets.functionSignatures ? needsNameSets.functionSignatures : new Set())]);
                    }
                }
                else {
                    // add Diagnostic
                    let diag = new vscode.Diagnostic(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, prelines[i].length)), `${uri} does not exist`, vscode.DiagnosticSeverity.Error);
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
                    const needsFile = yield vscode.workspace.fs.readFile(vscode.Uri.file(uri));
                    let needsNameSets = {
                        typeNames: new Set(),
                        functionNames: new Set(),
                        variableNames: new Set(),
                        nameSpaceNames: new Set()
                    };
                    if (NameSetsMemo.has(uri) === false) {
                        needsNameSets = yield getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]));
                        typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
                        functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
                        variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
                        nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
                        functionSignatures = new Set([...functionSignatures, ...(needsNameSets.functionSignatures ? needsNameSets.functionSignatures : new Set())]);
                    }
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
                if (typeof libPath === 'string') {
                    const needsDir = (needsDirMatch2[1].endsWith('.gs')) ? needsDirMatch2[1] : needsDirMatch2[1] + '.gs';
                    const uri = path.join(libPath, needsDir);
                    // check if file exists
                    if (fs.existsSync(uri)) {
                        const needsFile = yield vscode.workspace.fs.readFile(vscode.Uri.file(path.join(uri)));
                        let needsNameSets = {
                            typeNames: new Set(),
                            functionNames: new Set(),
                            variableNames: new Set(),
                            nameSpaceNames: new Set()
                        };
                        if (NameSetsMemo.has(uri)) {
                        }
                        else {
                            needsNameSets = yield getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]));
                            typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
                            functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
                            variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
                            nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
                            functionSignatures = new Set([...functionSignatures, ...(needsNameSets.functionSignatures ? needsNameSets.functionSignatures : new Set())]);
                        }
                    }
                    else {
                        vscode.window.showErrorMessage('File not found: ' + uri);
                        //add error token
                        let diag = new vscode.Diagnostic(new vscode.Range(new vscode.Position(i, 0), new vscode.Position(i, prelines[i].length)), `${uri} does not exist`, vscode.DiagnosticSeverity.Error);
                    }
                }
            }
            else {
                vscode.window.showErrorMessage('No workspace found');
            }
        }
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // search the line a variable declaration
        const variableDeclaration = /(?:let|int|adr|char|float|bool|short|long|generic)\s*(?:\[\d+\])*\s+([\w\d_]+)\s*=\s*(.*)/;
        let testLine = line;
        let shift = 0;
        let match = testLine.match(variableDeclaration);
        while (match) {
            if (match) {
                const identifier = match[1];
                variableNames.add(identifier);
                testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                shift = testLine.indexOf(identifier) + shift + identifier.length;
                match = testLine.match(variableDeclaration);
            }
        }
        // match a variable declaration without a value
        const variableDeclarationWithoutValue = /(?:let|int|adr|char|float|bool|short|long|generic)\s*(?:\[\d+\])*\s+([\w\d_]+)\s*(?:[;\]\)\,=])/;
        testLine = line;
        shift = 0;
        match = testLine.match(variableDeclarationWithoutValue);
        while (match) {
            if (match) {
                const identifier = match[1];
                variableNames.add(identifier);
                //console.log(`before shift: ${line}`);
                testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                //console.log(`after shift: ${testLine} shift: ${shift}`);
                shift = testLine.indexOf(identifier) + shift + identifier.length;
                match = testLine.match(variableDeclarationWithoutValue);
            }
        }
        // match 'under'
        const underMatch = /(?:under)\s+([\w\d_]+)/;
        testLine = line;
        shift = 0;
        match = testLine.match(underMatch);
        while (match) {
            if (match) {
                const identifier = match[1];
                nameSpaceNames.add(identifier);
                testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                shift = testLine.indexOf(identifier) + shift + identifier.length;
                match = testLine.match(underMatch);
            }
        }
        // search the line a class declaration
        const classDeclaration = line.match(/(?:class)\s+([\w\d_]+)\s*/);
        if (classDeclaration) {
            const className = classDeclaration[1];
            // add the class name to list of known classes
            typeNames.add(className);
        }
        // search the line for an enum declaration
        const enumDeclaration = line.match(/(?:enum)\s+([\w\d_]+)\s*/);
        if (enumDeclaration) {
            const enumName = enumDeclaration[1];
            //add the enum name to the list of known types
            typeNames.add(enumName);
            // loop through the lines until the end of the enum
            let enumBody = '';
            for (let j = i + 1; j < lines.length; j++) {
                const enumLine = lines[j];
                enumBody += enumLine;
                if (enumLine.includes('};')) {
                    // remove closing brace and semicolon
                    enumBody = enumBody.replace('};', '');
                    break;
                }
            }
            // remove newlines
            enumBody = enumBody.replace(/\r?\n|\r/g, '');
            //split by commas
            const enumValues = enumBody.split(',');
            // add each enum value to the list of known variables
            for (let j = 0; j < enumValues.length; j++) {
                const enumValue = enumValues[j].trim();
                variableNames.add(enumValue);
            }
            ;
        }
        ;
        // search the line a function declaration ie int foo(int a, int b)
        const functionDeclaration = line.match(/(?:int|adr|char|float|bool|short|byte|long|generic)\s+([\w\d_]+)\s*\(([\w\d_\s,\*]*)\)/);
        if (functionDeclaration) {
            const functionName = functionDeclaration[1];
            // add the function name to list of known functions
            functionNames.add(functionName);
            //extract the parameters from the function declaration
            const parameters = functionDeclaration[2];
            const paramList = parameters ? parameters.split(',') : [];
            const sig = {
                ident: functionName,
                params: paramList
            };
            functionSignatures.add(sig);
        }
        ;
        // search the line for a function declaration with overload operator ie int foo<<=>>copy(int a, int b)
        const opOverloadFunctionDeclaration = line.match(/(?:int|adr|char|float|bool|short|byte|long|generic)\s+([\w\d_]+)\s*(?:<<.+>>)\s*\(([\w\d_\s,\*]*)\)/);
        if (opOverloadFunctionDeclaration) {
            const functionName = opOverloadFunctionDeclaration[1];
            functionNames.add(functionName);
            //extract the parameters from the function declaration
            const parameters = opOverloadFunctionDeclaration[2];
            const paramList = parameters ? parameters.split(',') : [];
            const sig = {
                ident: functionName,
                params: paramList
            };
            functionSignatures.add(sig);
        }
        // search the line for variable declarations with a type
        for (const typeName of typeNames) {
            const variableDeclaration = new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:[;\\]\\)\\,=])`);
            let testLine = line;
            let shift = 0;
            let match = testLine.match(variableDeclaration);
            while (match) {
                if (match) {
                    const identifier = match[1];
                    variableNames.add(identifier);
                    //console.log(`before shift: ${line}`);
                    testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                    //console.log(`after shift: ${testLine} shift: ${shift}`);
                    shift = testLine.indexOf(identifier) + shift + identifier.length;
                    match = testLine.match(variableDeclaration);
                }
            }
        }
        // search the line for function declarations with a type
        for (const typeName of typeNames) {
            const functionDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*\\(([\\w\\d_\\s,\*]*)\\)`));
            if (functionDeclaration) {
                const functionName = functionDeclaration[1];
                const functionArguments = functionDeclaration[2].split(',');
                // add the function name to list of known functions
                functionNames.add(functionName);
                //extract the parameters from the function declaration
                const parameters = functionDeclaration[2];
                const paramList = parameters ? parameters.split(',') : [];
                const sig = {
                    ident: functionName,
                    params: paramList
                };
                functionSignatures.add(sig);
            }
        }
        // search the line for function declarations with a type and overload operator
        for (const typeName of typeNames) {
            const fdec = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:<<.+>>)\\s*\\(([\\w\\d_\\s,\*]*)`));
            if (fdec) {
                const functionName = fdec[1];
                functionNames.add(functionName);
                //extract the parameters from the function declaration
                const parameters = fdec[2];
                const paramList = parameters ? parameters.split(',') : [];
                const sig = {
                    ident: functionName,
                    params: paramList
                };
                functionSignatures.add(sig);
            }
        }
    }
    // return the sets
    return { typeNames, functionNames, variableNames, nameSpaceNames, functionSignatures };
});
exports.default = getSets;
//# sourceMappingURL=Parser.js.map