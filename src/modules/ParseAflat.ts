
let typeNames : string[] = [
    "int",
    "float",
    "adr",
    "short",
    "class"
]

export function getSymbols(input: string): string[] {
    let symbols: string[] = [];

    const sentences : string[] = input.split(/;|{|,/);

    for (let sentence of sentences) {
        sentence = sentence.trim();
        let words : string[] = sentence.split(" ");
        
        // remove tabs and newlines from each word
        for (let i = 0; i < words.length; i++) {
            words[i] = words[i].replace(/\t|\n|\r| /g, "");
        }

        // if the first word is in the type list, add the next word to the symbols
        if (typeNames.indexOf(words[0].trim().replace('\t', '')) > -1) {
            symbols.push(words[1].trim().replace('\t', ''));
            // if the first word is a class, add the next word to the typeNames
            if (words[0] == "class") {
                if (words[1].indexOf("{") == -1) {
                typeNames.push(words[1].trim().replace('\t', ''));
                } else typeNames.push(words[1].substring(0, words[1].indexOf("{")).trim().replace('\t', ''));
            }
        }
    };
    return symbols;
}