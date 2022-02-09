


export function getSymbols(input: string): string[] {
    let symbols: string[] = [];

    const sentences : string[] = input.split(";");

    for (let sentence of sentences) {
        let words : string[] = sentence.split(" ");
        // if the first word is in the type list, add the next word to the symbols
    };

    return symbols;
}