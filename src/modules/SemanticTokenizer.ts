import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import getSets from './Parser'

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

export const legend = (function () {
	const tokenTypesLegend = [
		'variable', 'class', 'function', 'string', 'error'
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

export class DocumentSemanticTokenProvidor implements vscode.DocumentSemanticTokensProvider {

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
				
				if (fs.existsSync(uri)){
				const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(uri));
				const needsNameSets = getSets(needsFile.toString());
				typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
				functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
				variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
				} else { 
					vscode.window.showErrorMessage(`${uri} does not exist`);
					
					r.push({
					line: i,
					startCharacter: 0,
					length: prelines[i].length,
					tokenType: 'error',
					tokenModifiers: []
					});
				}
				} else {
					vscode.window.showErrorMessage('No workspace found');
				}
			}

			// match .needs <dir>
			const needsDirMatch2 = prelines[i].match(/.needs\s+<([^>]+)>/);
			if (needsDirMatch2) {
				// read libpath from .vscode/settings.json
				if (vscode.workspace.workspaceFolders !== undefined) {
					const config = vscode.workspace.getConfiguration('aflat');
					const libPath = config.get('stddir');
					//console.log(libPath);
					if (typeof libPath === 'string') {
						const needsDir = (needsDirMatch2[1].endsWith('.gs')) ? needsDirMatch2[1] :  needsDirMatch2[1] + '.gs';
						const uri = path.join(libPath, needsDir);
						// check if file exists
						if (fs.existsSync(uri)) {
						const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(path.join(uri)));
						const needsNameSets = getSets(needsFile.toString());
						typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
						functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
						variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
						} else {
							vscode.window.showErrorMessage('File not found: ' + uri);
							//add error token
							r.push({
								line: i,
								startCharacter: 0,
								length: prelines[i].length,
								tokenType: 'error',
								tokenModifiers: []
							});
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
			interface rangeStr{
				start: number;
				end: number;
			}
			const streingRanges = new Set<rangeStr>();


			// check for double quoted strings
			const doubleQuoteMatch = line.match(/"([^"]*)"/);
			if (doubleQuoteMatch) {
				for (const match of doubleQuoteMatch) {
					streingRanges.add({
						start: line.indexOf(match),
						end: line.indexOf(match) + match.length
					})
				};
			};

			// check for <>
			const angleBracketMatch = line.match(/<([^>]*)>/);
			if (angleBracketMatch) {

				let angleBracketString = angleBracketMatch[1];
				streingRanges.add({
					start: line.indexOf(angleBracketString),
					end: line.indexOf(angleBracketString) + angleBracketString.length
				})
			}

			// check for single quoted strings
			const singleQuoteMatch = line.match(/'([^']*)'/);
			if (singleQuoteMatch) {
				let singleQuoteString = singleQuoteMatch[1];
				streingRanges.add({
					start: line.indexOf(singleQuoteString),
					end: line.indexOf(singleQuoteString) + singleQuoteString.length
				})
			}

			// check for // comments
			const commentMatch = line.match(/\/\/(.*)/);
			if (commentMatch) {
				streingRanges.add({
					start: line.indexOf(commentMatch[1]),
					end: line.length - 1
				})
			};

			// check for /* comments
			const commentMatch2 = line.match(/\/\*(.*)\*\//);
			if (commentMatch2) {
				streingRanges.add({
					start: line.indexOf(commentMatch2[1]),
					end: line.indexOf(commentMatch2[1]) + commentMatch2[1].length
				})
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
			for(let word of variableNames) {

				// sliding window search for word
				let start = 0;
				let end = word.length;
				
				while (end < line.length) {
					const window = line.substring(start, end);
					if (window === word){
						if ( start === 0 || !/[a-zA-Z0-9_]/.test(line[start - 1])) {
							if (end === line.length || !/[a-zA-Z0-9_]/.test(line[end])) {
								// check if the word is in a string
								let inString = false;
								for (const range of streingRanges) {
									if (range.start <= start && range.end >= start) {
										inString = true;
									}
								};
								if(!inString) r.push({
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
			for(let word  of typeNames) {
				// sliding window search for word
				let start = 0;
				let end = word.length;

				while (end < line.length) {
					const window = line.substring(start, end);
					if (window === word){
						if ( start === 0 || !/[a-zA-Z0-9_]/.test(line[start - 1])) {
							if (end === line.length || !/[a-zA-Z0-9_]/.test(line[end])) {
								// check if the word is in a string
								let inString = false;
								for (const range of streingRanges) {
									if (range.start <= start && range.end >= start) {
										inString = true;
									}
								};
								if(!inString) r.push({
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
			};

			// search the line for strings in the function list
			for(let word  of functionNames) {
				// sliding window search for word
				let start = 0;
				let end = word.length;
				
				while (end < line.length) {
					const window = line.substring(start, end);
					if (window === word){
						if ( start === 0 || !/[a-zA-Z0-9_]/.test(line[start - 1])) {
							if (end === line.length || !/[a-zA-Z0-9_]/.test(line[end])) {
								// check if the word is in a string
								let inString = false;
								for (const range of streingRanges) {
									if (range.start <= start && range.end >= start) {
										inString = true;
									}
								};
								if(!inString) r.push({
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
			};
		}
		return r;
    }

}