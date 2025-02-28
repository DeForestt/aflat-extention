import { TYPES } from './Constents';
import * as vscode from 'vscode';
import { createTypeFromClass, extractFunction, extractFunctions, LanguageData, extractClassText } from './Parsing/LanguageTools';
import * as fs from 'fs';
import * as path from 'path';
import getSets from './Parsing/Parser'
import { NameSets, Signature } from './Parsing/Parser';
import { lookupService } from 'dns';

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

export const legend = (function () {
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


interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: string;
	tokenModifiers: string[];
}

export class DocumentSemanticTokenProvidor implements vscode.DocumentSemanticTokensProvider {

	diagnosticList : vscode.Diagnostic[] = [];
	TokenDiagnositcs : vscode.DiagnosticCollection;
	NameSets : NameSets;

	constructor(TokenDiagnostics : vscode.DiagnosticCollection, NameSets : NameSets) {
		this.TokenDiagnositcs = TokenDiagnostics;
		this.NameSets = NameSets;
		TokenDiagnostics.clear();
	}

    async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		const allTokens : IParsedToken[] = await this._parseText(document.getText());
		const builder = new vscode.SemanticTokensBuilder();
		allTokens.forEach((token : IParsedToken) => {
			builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
		});
		// set the diagnostics
		this.TokenDiagnositcs.set(document.uri, this.diagnosticList);
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
		this.diagnosticList = [];
		const prelines = text.split(/\r\n|\r|\n/);
		
		const names = await getSets(text, new Set(), "main");

		let typeNames = names.typeNames;
		let functionNames = names.functionNames;
		let variableNames = names.variableNames;
		let nameSpaceNames = names.nameSpaceNames;
		let functionSignatures = names.functionSignatures? names.functionSignatures : new Set<Signature>();
		let moduleNameSpaces = names.moduleNameSpaces;
		let typeList = names.typeList;


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
				} else { 
					// add Diagnostic
					let diag : vscode.Diagnostic = new vscode.Diagnostic(
						new vscode.Range(
							new vscode.Position(i, 0),
							new vscode.Position(i, prelines[i].length)),
							`${uri} does not exist`, vscode.DiagnosticSeverity.Error);
					this.diagnosticList.push(diag);
				}
				} else {
					vscode.window.showErrorMessage('No workspace found');
				}
			}

			if (prelines[i].trim().startsWith("import")){
				const needsDir = prelines[i].substring(prelines[i].indexOf('\"') + 1, prelines[i].lastIndexOf('\"'));
				const work = vscode.workspace.workspaceFolders;
				if (work !== undefined) {
				const cwd = work[0].uri.fsPath;
				let uri = path.join(cwd, rootDir, needsDir);
				if (!needsDir.startsWith('.')){
					// add the std lib
					const config = vscode.workspace.getConfiguration('aflat');
					const libPath = config.get('stddir');
					if (typeof libPath === 'string') {
						uri = path.join(libPath.replace('head', 'src'), needsDir);
					}
				}
	
				if (!needsDir.endsWith('.af')) uri = uri + '.af';

				// check if file exists
				if (!fs.existsSync(uri)) {
					// remove the .af extension
					uri = uri.substring(0, uri.length - 3);
					uri = uri + '/mod.af';
				};
	
				if (fs.existsSync(uri)) {
					const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(uri));
	
					if ( prelines[i].indexOf('{')!== -1 && prelines[i].indexOf('}')!== -1) {
						// we are looking for functions
						const functionList = prelines[i].substring(prelines[i].indexOf('{') + 1, prelines[i].lastIndexOf('}'));
						const fNames = functionList.split(',');
						for (const name of fNames) {
							const func: LanguageData = extractFunction(needsFile.toString(), name.trim(), needsDir, true);
							if (func.error) {
								let diag : vscode.Diagnostic = new vscode.Diagnostic(
									new vscode.Range(
										new vscode.Position(i, 0),
										new vscode.Position(i, prelines[i].length)),
										func.error, vscode.DiagnosticSeverity.Error);
										console.log(func.error);
							} else if (func.data) {
								functionSignatures.add(func.data as Signature);
								functionNames.add(name.trim());
							};
						}
					} else if ( prelines[i].indexOf('*') !== -1) {
						// we are looking for all functions
						const funcList: LanguageData = extractFunctions(needsFile.toString(), needsDir, true);
						if (funcList.error) {
							let diag : vscode.Diagnostic = new vscode.Diagnostic(
								new vscode.Range(
									new vscode.Position(i, 0),
									new vscode.Position(i, prelines[i].length)),
									funcList.error, vscode.DiagnosticSeverity.Error);
						} else if (funcList.data) {
							const functions  = funcList.data as Signature[];
							functionSignatures = new Set([...functionSignatures, ...functions]);
							functionNames = new Set([...functionNames, ...functions.map(f => f.ident)]);
						}
					} else {
						// we are looking from Class names between 'import' and 'from'
						const classList = prelines[i].substring(prelines[i].indexOf('import') + 6, prelines[i].indexOf('from'));
						const classNames = classList.split(',');
						for (const name of classNames) {
							const classData: LanguageData = extractClassText(needsFile.toString(), name.trim());
							if (classData.error) {
								console.log(classData.error);
								let diag : vscode.Diagnostic = new vscode.Diagnostic(
									new vscode.Range(
										new vscode.Position(i, 0),
										new vscode.Position(i, prelines[i].length)),
										classData.error, vscode.DiagnosticSeverity.Error);
							} else if (classData.data) {
								const classData2 = classData.data as string;
								if (!typeList) typeList = TYPES;
								const classType = createTypeFromClass(name.trim(), classData2, typeList);
								if (classType) {
									typeList.push(classType);
									typeNames.add(name.trim());
									variableNames = new Set([...variableNames, ...classType.symbols.map(s => s.ident)]);
									functionNames = new Set([...functionNames, ...classType.functions.map(f => f.ident)]);
									functionSignatures = new Set([...functionSignatures, ...classType.functions]);
									console.log(`Added class ${name.trim()} with ${classType.symbols.length} variables and ${classType.functions.length} functions`)
								}
							};
						}
					};
				}
				} else {
					vscode.window.showErrorMessage('No workspace found');
				}
			};
	

			// match .needs <dir>
			const needsDirMatch2 = prelines[i].match(/.needs\s+<([^>]+)>/);
			if (needsDirMatch2) {
				// read libpath from .vscode/settings.json
				if (vscode.workspace.workspaceFolders !== undefined) {
					const config = vscode.workspace.getConfiguration('aflat');
					const libPath = config.get('stddir');
					if (typeof libPath === 'string') {
						const needsDir = (needsDirMatch2[1].endsWith('.gs')) ? needsDirMatch2[1] :  needsDirMatch2[1] + '.gs';
						const uri = path.join(libPath, needsDir);
						// check if file exists
						if (fs.existsSync(uri)) {
						} else {
							vscode.window.showErrorMessage('File not found: ' + uri);
							//add error token
							let diag : vscode.Diagnostic = new vscode.Diagnostic(
								new vscode.Range(
									new vscode.Position(i, 0),
									new vscode.Position(i, prelines[i].length)),
									`${uri} does not exist`, vscode.DiagnosticSeverity.Error);
							this.diagnosticList.push(diag);
						}
					}
				}
				else {
					vscode.window.showErrorMessage('No workspace found');
				}
			}
		}

		const myNames = await getSets(text, new Set(), "main");
		typeNames = new Set([...typeNames, ...myNames.typeNames]);
		functionNames = new Set([...functionNames, ...myNames.functionNames]);
		variableNames = new Set([...variableNames, ...myNames.variableNames]);
		nameSpaceNames = new Set([...nameSpaceNames, ...myNames.nameSpaceNames]);
		functionNames = new Set([...functionNames, ...myNames.functionNames]);
		moduleNameSpaces = myNames.moduleNameSpaces;
		functionSignatures = new Set([...functionSignatures, ...myNames.functionSignatures? myNames.functionSignatures : []]);

		this.NameSets.functionNames = functionNames;
		this.NameSets.variableNames = variableNames;
		this.NameSets.typeNames = typeNames;
		this.NameSets.nameSpaceNames = nameSpaceNames;
		this.NameSets.functionSignatures = functionSignatures;
		this.NameSets.moduleNameSpaces = moduleNameSpaces;

		// Track multi-line string ranges
		const multiLineStrings: { start: number; end: number}[] = [];
		let inMultiLineString = false;
		let multiLineStart = -1;
		let multilineIndex = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			for (let j = 0; j < line.length; j++) {
				if (line[j] === '~') {
					if (!inMultiLineString) {
						// Start a new multi-line string
						inMultiLineString = true;
						multiLineStart = i; // Record start line
					} else {
						// Close the multi-line string
						inMultiLineString = false;
						multiLineStrings.push({ start: multiLineStart, end: i});
					}
				}
			}
		}




		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			interface rangeStr{
				start: number;
				end: number;	
			}
			const stringRanges = new Set<rangeStr>();
					// Add multi-line string ranges to stringRanges

			for (const range of multiLineStrings) {
				if (range.start <= i && range.end >= i) {
					stringRanges.add({start: 0, end: line.length});
					break;
				}
			}	


			// sliding window to find all double quoted strings
			for (let j = 0; j < line.length; j++) {
				if (line[j] === '\"') {
					let start = j;
					let end = j+1;
					while ((line[end] !== '\"' || line[end-1] === '\\') && end < line.length) {
						end++;
					}
					stringRanges.add({start: start, end: end + 1});
					j = end + 1;
				}
			}

			// check for <>
			for (let j = 0; j < line.length; j++) {
				if (line[j] === '<') {
					let start = j;
					let end = j+1;
					while (line[end] !== '>' && end < line.length) {
						end++;
					}
					stringRanges.add({start: start, end: end + 1});
					j = end + 1;
				}
			}


			// check for single quoted strings
			for (let j = 0; j < line.length; j++) {
				if (line[j] === '\'') {
					let start = j;
					let end = j + 1;
					while ((line[end] !== '\'' || line[end-1] === '\\') && end < line.length) {
						end++;
					}
					stringRanges.add({start: start, end: end + 1});
					j = end + 1;
				}
			}

			// check for formatted strings
			for (let j = 0; j < line.length; j++) {
				if (line[j] === '`') {
					let start = j;
					let end = j + 1;
					while ((line[end] !== '`' || line[end-1] === '\\') && end < line.length) {
						end++;
						if (line[end] === '{') {
							let end2 = end + 1;
							while (line[end2] !== '}' && end2 < line.length) {
								end2++;
							}
							stringRanges.add({start: start, end: end});
							end = end2 + 1;
							start = end;
							j = end + 1;
						}
					};
					stringRanges.add({start: start, end: end + 1});
					j = end + 1;
				}
			}


			// check for // comments
			const commentMatch = line.match(/\/\/(.*)/);
			if (commentMatch) {
				stringRanges.add({
					start: line.indexOf(commentMatch[1]),
					end: line.length - 1
				})
			};

			// check for /* comments
			const commentMatch2 = line.match(/\/\*(.*)\*\//);
			if (commentMatch2) {
				stringRanges.add({
					start: line.indexOf(commentMatch2[1]),
					end: line.indexOf(commentMatch2[1]) + commentMatch2[1].length
				})
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
								for (const range of stringRanges) {
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
								for (const range of stringRanges) {
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
								for (const range of stringRanges) {
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
					// if function name is main, add a run button
					
					start++;
					end++;
				}
			};

			// search for namespaces
			for(let word  of nameSpaceNames) {
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
												for (const range of stringRanges) {
													if (range.start <= start && range.end >= start) {
														inString = true;
													}
												};
												if(!inString) r.push({
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
		
		return r;
    }

}