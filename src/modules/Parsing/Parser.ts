import { TYPES } from './../Constents';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createTypeFromClass, extractFunction, extractFunctions, LanguageData, extractClassText } from './LanguageTools';

export interface Signature {
	ident: string;
	params?: string[];
	moduleName: string;
	returnType?: string;
	doc?: vscode.MarkdownString;
}

export interface Type {
	ident: string;
	symbols: Symbol[];
	functions: Signature[];
};

export interface Symbol {
	ident: string;
	type: Type;
};

export interface NameSets {
	typeNames: Set<string>;
	functionNames: Set<string>;
	variableNames: Set<string>;
	nameSpaceNames: Set<string>;
	functionSignatures?: Set<Signature>;
	moduleNameSpaces?: Map<string, string>;
	typeList?: Type[];
}


const getSets = async (text : string, NameSetsMemo : Set<string>, moduleName : string, currentDir = '') : Promise<NameSets> =>{
	let typeNames = new Set<string>();
	let functionNames = new Set<string>();
	let variableNames = new Set<string>();
	let nameSpaceNames = new Set<string>();
	let functionSignatures = new Set<Signature>();
	let moduleNameSpaces = new Map<string, string>();
	let typeList: Type[] = TYPES;

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
			const needsDir = (needsDirMatch[1].endsWith('.gs')) ? needsDirMatch[1] :  needsDirMatch[1] + '.gs';
			// read the file
			const work = vscode.workspace.workspaceFolders
			if (work !== undefined) {
                        const cwd = work[0].uri.fsPath;
                        const base = needsDir.startsWith('./') ? currentDir : path.join(cwd, rootDir);
                        const uri = path.join(base, needsDir);
			
			if (fs.existsSync(uri)){
			const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(uri));
			let needsNameSets : NameSets = {
				typeNames: new Set<string>(),
				functionNames: new Set<string>(),
				variableNames: new Set<string>(),
				nameSpaceNames: new Set<string>(),
			};
			if ( NameSetsMemo.has(uri) ) {
			} else{
                                needsNameSets = await getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]), moduleName, path.dirname(uri));
				typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
				functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
				variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
				nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
				functionSignatures = new Set([...functionSignatures, ...(needsNameSets.functionSignatures? needsNameSets.functionSignatures : new Set<Signature>())]);
			}

			} else { 
				// add Diagnostic
				let diag : vscode.Diagnostic = new vscode.Diagnostic(
					new vscode.Range(
						new vscode.Position(i, 0),
						new vscode.Position(i, prelines[i].length)),
						`${uri} does not exist`, vscode.DiagnosticSeverity.Error);
			}
			} else {
				vscode.window.showErrorMessage('No workspace found');
			}
		}

		if (prelines[i].trim().startsWith("import")) {
			const needsDir = prelines[i].substring(prelines[i].indexOf('\"') + 1, prelines[i].lastIndexOf('\"'));
			const work = vscode.workspace.workspaceFolders;
			if (work !== undefined) {
                        const cwd = work[0].uri.fsPath;
                        const base = needsDir.startsWith('./') ? currentDir : path.join(cwd, rootDir);
                        let uri = path.join(base, needsDir);
			if (!needsDir.startsWith('.')){
				// add the std lib
				const config = vscode.workspace.getConfiguration('aflat');
				const libPath = config.get('stddir');
				if (typeof libPath === 'string') {
					uri = path.join(libPath.replace('head', 'src'), needsDir);
				}
			}

			if (!needsDir.endsWith('.af')) uri = uri + '.af';

			if (fs.existsSync(uri)){
				const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(uri));

				if ( prelines[i].indexOf('{')!== -1 && prelines[i].indexOf('}')!== -1) {
					// we are looking for functions
					const functionList = prelines[i].substring(prelines[i].indexOf('{') + 1, prelines[i].lastIndexOf('}'));
					const fNames = functionList.split(',');
					for (const name of fNames) {
					    const func: LanguageData = extractFunction(needsFile.toString(), name.trim(), moduleName, true);
						if (func.error) {
							let diag : vscode.Diagnostic = new vscode.Diagnostic(
								new vscode.Range(
									new vscode.Position(i, 0),
									new vscode.Position(i, prelines[i].length)),
									func.error, vscode.DiagnosticSeverity.Error);
									console.log(func.error);
						} else if (func.data) {
							// functionSignatures.add(func.data as Signature);
							functionNames.add(name.trim());
						};
					}
				} else if ( prelines[i].indexOf('*') !== -1) {
					// we are looking for all functions
					const funcList: LanguageData = extractFunctions(needsFile.toString(), moduleName, true);
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
				} 					} else {
					// we are looking from Class names between 'import' and 'from'
					const classList = prelines[i].substring(prelines[i].indexOf('import') + 6, prelines[i].indexOf('from'));
					const classNames = classList.split(',');
					for (const name of classNames) {
						const classData: LanguageData = extractClassText(needsFile.toString(), name.trim());
						if (classData.error) {
							let diag : vscode.Diagnostic = new vscode.Diagnostic(
								new vscode.Range(
									new vscode.Position(i, 0),
									new vscode.Position(i, prelines[i].length)),
									classData.error, vscode.DiagnosticSeverity.Error);
									console.log(classData.error);
						} else if (classData.data) {
							const classData2 = classData.data as string;
							const classType = createTypeFromClass(name.trim(), classData2, typeList);
							if (classType) {
								typeList.push(classType);
								typeNames.add(name.trim());
								variableNames = new Set([...variableNames, ...classType.symbols.map(s => s.ident)]);
								functionNames = new Set([...functionNames, ...classType.symbols.map(s => s.ident)]);
								functionSignatures = new Set([...functionSignatures, ...classType.functions]);
							} else {
								console.log('Could not create type from class');
								let diag : vscode.Diagnostic = new vscode.Diagnostic(
									new vscode.Range(
										new vscode.Position(i, 0),
										new vscode.Position(i, prelines[i].length)),
										'Could not create type from class', vscode.DiagnosticSeverity.Error);
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
					const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(path.join(uri)));
					let needsNameSets : NameSets = {
						typeNames: new Set<string>(),
						functionNames: new Set<string>(),
						variableNames: new Set<string>(),
						nameSpaceNames: new Set<string>()
					};
					if ( NameSetsMemo.has(uri) ) {
					} else{
                                                needsNameSets = await getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]), moduleName, path.dirname(uri));
						typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
						functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
						variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
						nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
						functionSignatures = new Set([...functionSignatures, ...(needsNameSets.functionSignatures? needsNameSets.functionSignatures : new Set<Signature>())]);
					}
					} else {
						vscode.window.showErrorMessage('File not found: ' + uri);
						//add error token
						let diag : vscode.Diagnostic = new vscode.Diagnostic(
							new vscode.Range(
								new vscode.Position(i, 0),
								new vscode.Position(i, prelines[i].length)),
								`${uri} does not exist`, vscode.DiagnosticSeverity.Error);
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

                // capture generic type declarations via types()
                const typesMatch = line.match(/types\s*\(([^)]+)\)/);
                if (typesMatch) {
                        const tnames = typesMatch[1].split(',').map(t => t.trim()).filter(t => t);
                        for (const t of tnames) {
                                typeNames.add(t);
                        }
                }

		// search the line a variable declaration
		const variableDeclaration = /(?:any|let|int|adr|byte|char|float|bool|short|long|generic|byte)\s*(?:\[\d+\])*\s*(?:<.*>)?\s*([\w\d_]+)\s*=\s*(.*)/;
        let testLine = line;
        let shift = 0;
        let match = testLine.match(variableDeclaration);
        while (match) {
            if (match){
                const identifier = match[1];
				variableNames.add(identifier);
                testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                shift = testLine.indexOf(identifier) + shift + identifier.length;
                match = testLine.match(variableDeclaration);
            }
        }

		// match a declaration that looks 

		// match a variable declaration without a value
		const variableDeclarationWithoutValue = /(?:any|let|int|adr|byte|char|float|bool|short|long|generic)\s*(?:\[\d+\])*\s*(?:<.*>)?\s+([\w\d_]+)\s*(?:[;\]\)\,=])/;
        testLine = line;
        shift = 0;
        match = testLine.match(variableDeclarationWithoutValue);
        while (match) {
            if (match){
                const identifier = match[1];
				variableNames.add(identifier);
                testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                shift = testLine.indexOf(identifier) + shift + identifier.length;
                match = testLine.match(variableDeclarationWithoutValue);
            }
        }

		// match 'under'
		// match 'from "capture" under [namespace]'
		const underMatch1 = /(?:from\s+\"([^\"]+)\"\s+)?under\s+([\w\d_]+)/;
		testLine = line;
		shift = 0;
		match = testLine.match(underMatch1);
		if (match && moduleName == 'main') {
			const mod = match[1];
			const ns = match[2];

			
			if (ns && mod) {
				nameSpaceNames.add(ns);
				moduleNameSpaces.set(ns, mod);
			};

			testLine = testLine.substring(testLine.indexOf(mod) + mod.length);
			shift = testLine.indexOf(mod) + shift + mod.length;
			match = testLine.match(underMatch1);
		}


		// const underMatch = /(?:under)\s+([\w\d_]+)/;
		
		// testLine = line;
		// shift = 0;
		// match = testLine.match(underMatch);
		// while (match) {
		// 	if (match){
		// 		const identifier = match[1];
		// 		nameSpaceNames.add(identifier);
		// 		testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
		// 		shift = testLine.indexOf(identifier) + shift + identifier.length;
		// 		match = testLine.match(underMatch);
		// 	}
		// }



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
			};
		};

		// search the line a function declaration ie int foo(int a, int b)
		const functionDeclaration = line.match(/(?:any|void|int|adr|char|float|bool|short|byte|long|generic)\s+([\w\d_]+)\s*\(([\w\d_\s<>,?&\*]*)\)/);
		if (functionDeclaration) {
			const functionName = functionDeclaration[1];

			// add the function name to list of known functions
			functionNames.add(functionName);

			//extract the parameters from the function declaration
			const parameters = functionDeclaration[2];
			const paramList : string[] = parameters? parameters.split(',') : [];
			const sig : Signature = {
				ident: functionName,
				params: paramList,
				moduleName: moduleName
			};

			// check the line above for documentation comments
			if (i > 0) {
				const prevLine = lines[i - 1];
				if (prevLine.trim().endsWith('*/')) {
					let comment = new vscode.MarkdownString();
					let j = i - 1;
					for (j = i - 1; j >= 0; j--) {
						if (lines[j].trim().startsWith('/*')) {
							break;
						}
					}
					for (let k = j; k < i; k++) {
						const commentLine = lines[k];
						comment.appendMarkdown(commentLine);
					};
					sig.doc = comment;
				};
			}

			functionSignatures.add(sig);
		};

		// search the line for a function declaration with overload operator ie int foo<<=>>copy(int a, int b)
		const opOverloadFunctionDeclaration = line.match(/(?:any|void|int|adr|char|float|bool|short|byte|long|generic)\s+([\w\d_]+)\s*(?:<<.+>>)\s*\(([\w\d_\s,<>?&\*]*)\)/);
		if (opOverloadFunctionDeclaration) {
			const functionName = opOverloadFunctionDeclaration[1];
			functionNames.add(functionName);

			//extract the parameters from the function declaration
			const parameters = opOverloadFunctionDeclaration[2];
			const paramList : string[] = parameters? parameters.split(',') : [];
			const sig : Signature = {
				ident: functionName,
				params: paramList,
				moduleName: moduleName,
				returnType: opOverloadFunctionDeclaration[0]
			};

			// check the line above for documentation comments
			if (i > 0) {
				const prevLine = lines[i - 1];
				let comment = new vscode.MarkdownString();
				if (prevLine.trim().endsWith('*/')) {
					let j = i - 1;
					for (j = i - 1; j >= 0; j--) {
						if (lines[j].trim().startsWith('/*')) {
							break;
						}
					}
					for (let k = j; k < i; k++) {
						const commentLine = lines[k].replace('/*', '').replace('*/', '').replace('*', ' ').trim();
						comment.appendMarkdown(commentLine);
					};
					sig.doc = comment;
				};
			}

			functionSignatures.add(sig);
		}

		// Match `fn functionName(type1 param1, type2 param2) -> returnType {`
		const functionRegex = /fn\s+([\w\d_]+)\s*\(([\w\d_\s<>,?&\*]*)\)\s*(?:->\s*([\w\d_?]+))?/;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Match the new function syntax
			const functionMatch = line.match(functionRegex);
			if (functionMatch) {
				const functionName = functionMatch[1];
				const functionArgs = functionMatch[2];
				let returnType = functionMatch[3] || "void"; // Default to void if not present

				// If the return type has `?`, wrap it in Option<T>
				if (returnType.endsWith("?")) {
					returnType = `Option<${returnType.slice(0, -1)}>`;
				}

				// Parse C-style parameters: "type1 param1, type2 param2"
				const paramList: string[] = [];
				if (functionArgs.trim()) {
					const params = functionArgs.split(',').map(p => p.trim());
					for (const param of params) {
						const parts = param.split(/\s+/); // Split by space to separate type and name
						if (parts.length === 2) {
							paramList.push(`${parts[0]} ${parts[1]}`); // Keep "type name" format
						} else {
							console.warn(`Malformed parameter: ${param}`);
						}
					}
				}

				// Build function signature object
				const sig: Signature = {
					ident: functionName,
					params: paramList,
					moduleName: moduleName,
					returnType: returnType
				};

				// Check the line above for documentation comments
				if (i > 0) {
					const prevLine = lines[i - 1];
					if (prevLine.trim().endsWith('*/')) {
						let comment = new vscode.MarkdownString();
						let j = i - 1;
						for (j = i - 1; j >= 0; j--) {
							if (lines[j].trim().startsWith('/*')) {
								break;
							}
						}
						for (let k = j; k < i; k++) {
							const commentLine = lines[k].replace('/*', '').replace('*/', '').replace('*', ' ').trim();
							comment.appendMarkdown(commentLine);
						};
						sig.doc = comment;
					};
				}

				// Add function name and signature to known lists
				functionNames.add(functionName);
				functionSignatures.add(sig);
			}
		}


		// search the line for variable declarations with a type
                for (const typeName of typeNames) {
                        const variableDeclaration = new RegExp(`(?:${typeName})(?:\\s*::\\s*<[^>]+>)?\\s+([\\w\\d_]+)\\s*(?:[;\\]\\)\\,=])`);
			let testLine = line;
			let shift = 0;
			let match = testLine.match(variableDeclaration);
			while (match) {
				if (match){
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
                        const functionDeclaration = line.match(new RegExp(`(?:${typeName})(?:\s*::\s*<[^>]+>)?\s+([\w\d_]+)\s*\(([\w\d_\s,<>?&\*]*)`));
			if (functionDeclaration) {
				const functionName = functionDeclaration[1];
				const functionArguments = functionDeclaration[2].split(',');

				// add the function name to list of known functions
				functionNames.add(functionName);

				//extract the parameters from the function declaration
				const parameters = functionDeclaration[2];
				const paramList : string[] = parameters? parameters.split(',') : [];
				const sig : Signature = {
					ident: functionName,
					params: paramList,
					moduleName: moduleName,
					returnType: typeName
				};

				if (sig.ident === 'init') {
					sig.ident = typeName;
				}

							// check the line above for documentation comments
				if (i > 0) {
					const prevLine = lines[i - 1];
					let comment = new vscode.MarkdownString();
					if (prevLine.trim().endsWith('*/')) {
						let j = i - 1;
						for (j = i - 1; j >= 0; j--) {
							if (lines[j].trim().startsWith('/*')) {
								break;
							}
						}
						for (let k = j; k < i; k++) {
							const commentLine = lines[k].replace('/*', '').replace('*/', '').replace('*', ' ').trim();
							comment.appendMarkdown(commentLine);
						};
						sig.doc = comment;
					};
				}

				functionSignatures.add(sig);
			}
		}

		// search the line for function declarations with a type and overload operator
		for (const typeName of typeNames) {

			const fdec = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:<<.+>>)\\s*\\(([\\w\\d_\\s,<>?&\*]*)`));
			if (fdec) {
				const functionName = fdec[1];
				functionNames.add(functionName);

				//extract the parameters from the function declaration
				const parameters = fdec[2];
				const paramList : string[] = parameters? parameters.split(',') : [];
				const sig : Signature = {
					ident: functionName,
					params: paramList,
					moduleName: moduleName,
					returnType: typeName
				};
				functionSignatures.add(sig);

			}
		}

		// match `transform identifier` and add it to the classes
		const transformMatch = line.match(/transform\s+([\w\d_]+)/);
		if (transformMatch) {
			const className = transformMatch[1];
			typeNames.add(className);
		}

	}

	// return the sets
	return {typeNames, functionNames, variableNames, nameSpaceNames, functionSignatures, moduleNameSpaces, typeList};
}

export default getSets;