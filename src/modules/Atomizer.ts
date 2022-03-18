
// the atom unit represents an indivizible piece of the source code
export enum AtomType {
    stringLiteral,
    charLiteral,
    number,
    LObject,
    Symbol,
    Comment
}

export interface Atom {
    type : AtomType;
    value : string;
    line : number;
    column : number;
    length : number;
}

export const atomize = (text : string) : Atom[] => {
    const atoms : Atom[] = [];

    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        // read the line char by char
        for (let j = 0; j < line.length; j++) {

            // check for string literals
            if (line[j] === '"'){
                let value = '';
                let k = j + 1;
                while (line[k] !== '"') {
                    value += line[k];
                    k++;
                    
                    if (k === line.length){
                        i++;
                        k = 0;
                        line = lines[i];
                    }

                    if (line[k] === '\\'){
                        value += line[k];
                        k++;
                        value += line[k];
                    }
                }
                atoms.push({
                    type: AtomType.stringLiteral,
                    value: value,
                    line: i,
                    column: j,
                    length: value.length
                });
                j = k;
            } else

            // check for char literals
            if (line[j] === '\''){
                let value = '\'';
                let k = j + 1;
                while (line[k] !== '\'') {
                    value += line[k];
                    k++;
                    
                    if (k === line.length){
                        i++;
                        k = 0;
                        line = lines[i];
                    }

                    if (line[k] === '\\'){
                        value += line[k];
                        k++;
                        value += line[k];
                    }
                }
                atoms.push({
                    type: AtomType.charLiteral,
                    value: value,
                    line: i,
                    column: j,
                    length: value.length
                });
                j = k;
            } else

            // check for numbers
            if (/[\d#-]/.test(line[j])){
                let value = '';
                let k = j;
                while (/[\d#-]/.test(line[k])) {
                    value += line[k];
                    k++;
                }
                atoms.push({
                    type: AtomType.number,
                    value: value,
                    line: i,
                    column: j,
                    length: value.length
                });
                j = k;
            } else
            
            // check for l-objects
            if (/[a-zA-Z_]/){
                let value = '';
                let k = j;
                while (/[a-zA-Z_]/.test(line[k])) {
                    value += line[k];
                    k++;
                }
                atoms.push({
                    type: AtomType.LObject,
                    value: value,
                    line: i,
                    column: j,
                    length: value.length
                });
                j = k;
            } else

            // Check for comments
            if (line[j] === '/' && line[j+1] === '*'){
                let value = '';
                let k = j + 2;
                while (line[k] !== '*' && line[k+1] !== '/') {
                    value += line[k];
                    k++;
                    
                    if (k === line.length){
                        i++;
                        k = 0;
                        line = lines[i];
                    }
                }
                atoms.push({
                    type: AtomType.Comment,
                    value: value,
                    line: i,
                    column: j,
                    length: value.length
                });
                j = k;
            } else
            // check for line comments
            if (line[j] === '/' && line[j+1] === '/'){
                // skip the rest of the line
                j = line.length;
            } else {
                atoms.push({
                    // everything else is a symbol
                    type: AtomType.Symbol,
                    value: line[j],
                    line: i,
                    column: j,
                    length: 1
                });
            }
        }
    }

    return atoms;
}