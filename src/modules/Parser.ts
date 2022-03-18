export interface NameSets {
	typeNames: Set<string>;
	functionNames: Set<string>;
	variableNames: Set<string>;
}

const getSets = (text : string) : NameSets =>{
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
			const vdec = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*(?:[;\\]\\)\\,=])`));
			if (vdec) {
				const variableName = vdec[1];

				// add the variable name to list of known variables
				variableNames.add(variableName);
			}
		}

		// search the line for function declarations with a type
		for (const typeName of typeNames) {
			const fdec = line.match(new RegExp(`(?:${typeName})\\s+([\\w\\d_]+)\\s*\\(([\\w\\d_\\s,]*)\\)`));
			if (fdec) {
				const functionName = fdec[1];

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