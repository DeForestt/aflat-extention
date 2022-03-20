import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface NameSets {
	typeNames: Set<string>;
	functionNames: Set<string>;
	variableNames: Set<string>;
}

const getSets = async (text : string) : Promise<NameSets> =>{
	let typeNames = new Set<string>();
	let functionNames = new Set<string>();
	let variableNames = new Set<string>();

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
			const uri = path.join(cwd, rootDir, needsDir);
			
			if (fs.existsSync(uri)){
			const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(uri));
			const needsNameSets = await getSets(needsFile.toString());
			typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
			functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
			variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
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
					const needsNameSets = await getSets(needsFile.toString());
					typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
					functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
					variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
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
		const functionDeclaration = line.match(/(?:int|adr|char|float|bool|short|byte)\s+([\w\d_]+)\s*\(([\w\d_\s,]*)\)/);
		if (functionDeclaration) {
			const functionName = functionDeclaration[1];

			// add the function name to list of known functions
			functionNames.add(functionName);
		};

		// search the line for a function declaration with overload operator ie int foo<<=>>copy(int a, int b)
		const opOverloadFunctionDeclaration = line.match(/(?:int|adr|char|float|bool|short|byte)\s+([\w\d_]+)\s*(?:<<.+>>)\s*\(([\w\d_\s,]*)\)/);
		if (opOverloadFunctionDeclaration) {
			const functionName = opOverloadFunctionDeclaration[1];
			functionNames.add(functionName);
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

		// search the line for function declarations with a type and overload operator
		for (const typeName of typeNames) {
			const fdec= line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:<<.+>>)\\s*\\(([\\w\\d_\\s,]*)`));
			if (fdec) {
				const functionName = fdec[1];
				functionNames.add(functionName);
			}
		}
	}

	// return the sets
	return {typeNames, functionNames, variableNames};
}

export default getSets;