import { legend } from './SemanticTokenizer';

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

interface rangeStr{
    start: number;
    end: number;
}

export const atomize = (text : string) : Atom[] => {
    const atoms : Atom[] = [];
    let inMultiLineComment = false;
    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const stringRanges = new Set<rangeStr>();
        if (inMultiLineComment) {
            const commentEnd = line.indexOf('*/');
            if (commentEnd === -1) {
                // add the whole line to stringRanges
                stringRanges.add({start: 0, end: line.length});
            } else {
                inMultiLineComment = false;
                stringRanges.add({start: 0, end: commentEnd + 1});
            };
        }

        // find the range of any string literals
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '\"') {
                let start = j;
                let end = j + 1;
                while ((line[end] !== '\"' || line[end-1] === '\\') && end < line.length) {
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

        // find of single quoted strings
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '\'') {
                let start = j;
                let end = j+1;
                while ((line[end] !== '\'' || line[end-1] === '\\') && end < line.length) {
                    end++;
                }
                stringRanges.add({start: start, end: end + 1});
                j = end+1;
            }
        }

        // find angle bracket strings
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '<') {
                let start = j;
                let end = j+1;
                while ((line[end] !== '>') && end < line.length) {
                    end++;
                }
                stringRanges.add({start: start, end: end + 1});
                j = end+1;
            }
        }

        // check for comments
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '/' && line[j+1] === '/') {
                let start = j;
                let end = j;
                while (line[end] !== '\n' && end < line.length) {
                    end++;
                }
                stringRanges.add({start: start, end: end + 1});
                j = end;
            }
        }

        // check for multi line comments
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '/' && line[j+1] === '*') {
                let start = j;
                let end = j;
                while (line[end] !== '*' && line[end+1] !== '/' && end < line.length) {
                    end++;
                }
                stringRanges.add({start: start, end: end + 1});
                if (end + 1 < line.length) {
                    j = end + 1;
                } else {
                    inMultiLineComment = true;
                }
            }
        }


        // regex to match an identifier
        const identifierRegex = /[a-zA-Z_][a-zA-Z0-9_]*/;
        let testLine = line;
        let shift = 0;
        let match = testLine.match(identifierRegex);
        while (match) {
            if (match){
                const identifier = match[0];
                const atom : Atom = {
                    type: AtomType.LObject,
                    value: identifier,
                    line: i,
                    column: testLine.indexOf(identifier) + shift,
                    length: identifier.length
                }; 
            
                // check if the identifier is in a string or angle bracket
                let inString = false;
                for (let range of stringRanges) {
                    if (range.start <= atom.column && range.end >= atom.column + atom.length) {
                        inString = true;
                        break;
                    }
                }
                if (!inString)
                atoms.push(atom);
                testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                shift = atom.column + atom.length;
                match = testLine.match(identifierRegex);
            }
        }
    }

    return atoms;
}