import * as vscode from 'vscode';
import * as path from 'path';
import { Console } from 'console';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

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


interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

interface NameSets {
	typeNames: Set<string>;
	functionNames: Set<string>;
	variableNames: Set<string>;
}

class DocumentSemanticTokenProvidor implements vscode.DocumentSemanticTokensProvider {

    async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		const allTokens : IParsedToken[] = await this._parseText(document.getText());
		const builder = new vscode.SemanticTokensBuilder();
		allTokens.forEach((token : IParsedToken) => {
			builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
		});
		return builder.build();
	}

    private _encodeTokenType(tokenType: string): number {
        if (tokenTypes.has(tokenType)) {
			return tokenTypes.get(tokenType)!;
		}
		return 0;
    }

	private _encodeTokenModifiers(strTokenModifiers: string[]): number {
		let result = 0;
		for (let i = 0; i < strTokenModifiers.length; i++) {
			const tokenModifier = strTokenModifiers[i];
			if (tokenModifiers.has(tokenModifier)) {
				result = result | (1 << tokenModifiers.get(tokenModifier)!);
			} else if (tokenModifier === 'notInLegend') {
				result = result | (1 << tokenModifiers.size + 2);
			}
		}
		return result;
	}

    private async _parseText(text: string): Promise<IParsedToken[]> {
        const r: IParsedToken[] = [];
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
				const needsDir = (needsDirMatch[1].endsWith('.gs')) ? needsDirMatch[1] :  needsDirMatch[1] + '.gs';
				// read the file
				const work = vscode.workspace.workspaceFolders
				if (work !== undefined) {
				const cwd = work[0].uri.fsPath;
				const uri = path.join(cwd, rootDir, needsDir);

				const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(uri));
				const needsNameSets = getSets(needsFile.toString());
				typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
				functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
				variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
				} else {
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
						const needsDir = (needsDirMatch2[1].endsWith('.gs')) ? needsDirMatch2[1] :  needsDirMatch2[1] + '.gs';
						const uri = path.join(libPath, rootDir, needsDir);
						console.log(uri);
						const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(path.join(uri)));
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

			// check for double quoted strings
			const doubleQuoteMatch = line.match(/"([^"]*)"/);
			if (doubleQuoteMatch) {
				r.push({
					line: i,
					startCharacter: line.indexOf(doubleQuoteMatch[0]),
					length: doubleQuoteMatch[0].length,
					tokenType: 'string',
					tokenModifiers: []
				});
			};

			// check for <>
			const angleBracketMatch = line.match(/<([^>]*)>/);
			if (angleBracketMatch) {
				r.push({
					line: i,
					startCharacter: line.indexOf(angleBracketMatch[0]),
					length: angleBracketMatch[0].length,
					tokenType: 'string',
					tokenModifiers: []
				});
			}

			// check for single quoted strings
			const singleQuoteMatch = line.match(/'([^']*)'/);
			if (singleQuoteMatch) {

				r.push({
					line: i,
					startCharacter: line.indexOf(singleQuoteMatch[0]),
					length: singleQuoteMatch[0].length,
					tokenType: 'string',
					tokenModifiers: []
				});
			}

			// check for // comments
			const commentMatch = line.match(/\/\/(.*)/);
			if (commentMatch) {
				r.push({
					line: i,
					startCharacter: line.indexOf(commentMatch[0]),
					length: commentMatch[0].length,
					tokenType: 'comment',
					tokenModifiers: []
				});
			};

			// check for /* comments
			const commentMatch2 = line.match(/\/\*(.*)\*\//);
			if (commentMatch2) {
				r.push({
					line: i,
					startCharacter: line.indexOf(commentMatch2[0]),
					length: commentMatch2[0].length,
					tokenType: 'comment',
					tokenModifiers: []
				});
			}

			// search the line for variable declarations with a type
			for (const typeName of typeNames) {
				const variableDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:[;\\]\\)\\,=])`));
				if (variableDeclaration) {
					console.log(`found variable declaration with type ${typeName}`);
					const variableName = variableDeclaration[1];


					// add the variable name to list of known variables
					variableNames.add(variableName);
				}
			}

			// search the line for function declarations with a type
			for (const typeName of typeNames) {
				const functionDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*\\(([\\w\\d_\\s,]*)\\)`));
				if (functionDeclaration) {
					console.log(`found function declaration with type ${typeName}`);
					const functionName = functionDeclaration[1];
					const functionArguments = functionDeclaration[2].split(',');

					// add the function name to list of known functions
					functionNames.add(functionName);
				}
			}

			// search the line for strings in the variable list
			for(let word  of variableNames) {
				if (line.indexOf(word) >= 0) {
					if ( line.indexOf(word) === 0 || !/[a-zA-Z0-9_]/.test(line[line.indexOf(word) - 1])) {
						if (line.indexOf(word) + word.length === line.length || !/[a-zA-Z0-9_]/.test(line[line.indexOf(word) + word.length])) {
							r.push({
								line: i,
								startCharacter: line.indexOf(word),
								length: word.length,
								tokenType: 'variable',
								tokenModifiers: []
							});
						}
					}
				}
			}

			// search the line for strings in the class list
			for(let word  of typeNames) {
				if (line.indexOf(word) >= 0) {
					if ( line.indexOf(word) === 0 || !/[a-zA-Z0-9_]/.test(line[line.indexOf(word) - 1])) {
						if (line.indexOf(word) + word.length === line.length || !/[a-zA-Z0-9_]/.test(line[line.indexOf(word) + word.length])) {
							r.push({
								line: i,
								startCharacter: line.indexOf(word),
								length: word.length,
								tokenType: 'class',
								tokenModifiers: []
							});
						}
					}
				}
			};

			// search the line for strings in the function list
			for(let word  of functionNames) {
				if (line.indexOf(word) >= 0) {
					if ( line.indexOf(word) === 0 || !/[a-zA-Z0-9_]/.test(line[line.indexOf(word) - 1])) {
						if (line.indexOf(word) + word.length === line.length || !/[a-zA-Z0-9_]/.test(line[line.indexOf(word) + word.length])) {
							r.push({
								line: i,
								startCharacter: line.indexOf(word),
								length: word.length,
								tokenType: 'function',
								tokenModifiers: []
							});
						}
					}
				}
			};
		}
		return r;
    }

}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'aflat'}, new DocumentSemanticTokenProvidor(), legend));
};

export function deactivate() {};

export function getSets(text : string) : NameSets{
	const typeNames = new Set<string>();
	const functionNames = new Set<string>();
	const variableNames = new Set<string>();

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
		};


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
	return {typeNames, functionNames, variableNames};
}