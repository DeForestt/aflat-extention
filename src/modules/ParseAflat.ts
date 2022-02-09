
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
        let words : string[] = sentence.split(" ");
        // if the first word is in the type list, add the next word to the symbols
        if (typeNames.indexOf(words[0]) > -1) {
            symbols.push(words[1]);
            // if the first word is a class, add the next word to the typeNames
            if (words[0] == "class") {
                if (words[1].indexOf("{") == -1) {
                typeNames.push(words[1]);
                } else typeNames.push(words[1].substring(0, words[1].indexOf("{")));
            }
        }
    };

    console.log (symbols);

    return symbols;
}