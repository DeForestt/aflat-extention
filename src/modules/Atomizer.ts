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

export const atomize = (text : string) : Atom[] => {
    const atoms : Atom[] = [];

    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        interface rangeStr{
            start: number;
            end: number;
        }

        // find the range of any string literals
        const stringRanges = new Set<rangeStr>();
        const doubleQuoteMatch = line.match(/"([^"]*)"/);
        if (doubleQuoteMatch) {
            for (const match of doubleQuoteMatch) {
                stringRanges.add({
                    start: line.indexOf(match),
                    end: line.indexOf(match) + match.length
                })
            };
        };

        const angleBracketLiteralRanges = line.match(/<([^>]*)>/g);

        if (angleBracketLiteralRanges) {
            for (const match of angleBracketLiteralRanges) {
                stringRanges.add({
                    start: line.indexOf(match),
                    end: line.indexOf(match) + match.length
                })
            };
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
                //console.log(`${identifier} at ${atom.line}:${atom.column} is in string: ${inString}`);
                if (!inString)
                atoms.push(atom);
                //console.log(`before shift: ${line}`);
                testLine = testLine.substring(testLine.indexOf(identifier) + identifier.length);
                //console.log(`after shift: ${testLine} shift: ${shift}`);
                shift = atom.column + atom.length;
                match = testLine.match(identifierRegex);
            }
        }
    }

    return atoms;
}