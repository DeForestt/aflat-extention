import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface NameSets {
	typeNames: Set<string>;
	functionNames: Set<string>;
	variableNames: Set<string>;
	nameSpaceNames: Set<string>;
}


const getSets = async (text : string, NameSetsMemo : Set<string>) : Promise<NameSets> =>{
	let typeNames = new Set<string>();
	let functionNames = new Set<string>();
	let variableNames = new Set<string>();
	let nameSpaceNames = new Set<string>();

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
			let needsNameSets = {
				typeNames: new Set<string>(),
				functionNames: new Set<string>(),
				variableNames: new Set<string>(),
				nameSpaceNames: new Set<string>()
			};
			if ( NameSetsMemo.has(uri) ) {
			} else{
				needsNameSets = await getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]));
				typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
				functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
				variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
				nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
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

			if (fs.existsSync(uri)){
			const needsFile = await vscode.workspace.fs.readFile(vscode.Uri.file(uri));
			let needsNameSets = {
				typeNames: new Set<string>(),
				functionNames: new Set<string>(),
				variableNames: new Set<string>(),
				nameSpaceNames: new Set<string>()
			};
			if ( NameSetsMemo.has(uri) === false ) {
				needsNameSets = await getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]));
				typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
				functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
				variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
				nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
			}

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
					let needsNameSets = {
						typeNames: new Set<string>(),
						functionNames: new Set<string>(),
						variableNames: new Set<string>(),
						nameSpaceNames: new Set<string>()
					};
					if ( NameSetsMemo.has(uri) ) {
					} else{
						needsNameSets = await getSets(needsFile.toString(), new Set([...NameSetsMemo, uri]));
						typeNames = new Set([...typeNames, ...needsNameSets.typeNames]);
						functionNames = new Set([...functionNames, ...needsNameSets.functionNames]);
						variableNames = new Set([...variableNames, ...needsNameSets.variableNames]);
						nameSpaceNames = new Set([...nameSpaceNames, ...needsNameSets.nameSpaceNames]);
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

		// search the line a variable declaration
		const variableDeclaration = /(?:int|adr|char|float|bool|short|long)\s*(?:\[\d+\])*\s+([\w\d_]+)\s*=\s*(.*)/;
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

		// match a variable declaration without a value
		const variableDeclarationWithoutValue = /(?:int|adr|char|float|bool|short|long)\s*(?:\[\d+\])*\s+([\w\d_]+)\s*(?:[;\]\)\,=])/
		
        testLine = line;
        shift = 0;
        match = testLine.match(variableDeclarationWithoutValue);
        while (match) {
            if (match){
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
			if (match){
				const identifier = match[1];
				nameSpaceNames.add(identifier);
				//console.log(`before shift: ${line}`);
				testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
				//console.log(`after shift: ${testLine} shift: ${shift}`);
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
			};
		};

		// search the line a function declaration ie int foo(int a, int b)
		const functionDeclaration = line.match(/(?:int|adr|char|float|bool|short|byte|long)\s+([\w\d_]+)\s*\(([\w\d_\s,\*]*)\)/);
		if (functionDeclaration) {
			const functionName = functionDeclaration[1];

			// add the function name to list of known functions
			functionNames.add(functionName);
		};

		// search the line for a function declaration with overload operator ie int foo<<=>>copy(int a, int b)
		const opOverloadFunctionDeclaration = line.match(/(?:int|adr|char|float|bool|short|byte|long)\s+([\w\d_]+)\s*(?:<<.+>>)\s*\(([\w\d_\s,\*]*)\)/);
		if (opOverloadFunctionDeclaration) {
			const functionName = opOverloadFunctionDeclaration[1];
			functionNames.add(functionName);
		}	


		// search the line for variable declarations with a type
		for (const typeName of typeNames) {
			const variableDeclaration = new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:[;\\]\\)\\,=])`);
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
			const functionDeclaration = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*\\(([\\w\\d_\\s,\*]*)\\)`));
			if (functionDeclaration) {
				const functionName = functionDeclaration[1];
				const functionArguments = functionDeclaration[2].split(',');

				// add the function name to list of known functions
				functionNames.add(functionName);
			}
		}

		// search the line for function declarations with a type and overload operator
		for (const typeName of typeNames) {
			const fdec= line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:<<.+>>)\\s*\\(([\\w\\d_\\s,\*]*)`));
			if (fdec) {
				const functionName = fdec[1];
				functionNames.add(functionName);
			}
		}
	}

	// return the sets
	return {typeNames, functionNames, variableNames, nameSpaceNames};
}

export default getSets;