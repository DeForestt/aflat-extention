"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSymbols = void 0;
const vscode = require("vscode");

let typeNames = [
    "int",
    "float",
    "adr",
    "short",
    "class"
];

let homeDir = "";

function getSymbols(input) {
    if (vscode.workspace.workspaceFolders !== undefined) {
        homeDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    let symbols = [];
    const sentences = input.split(/;|{|,/);
    for (let sentence of sentences) {
        sentence = sentence.trim();
        let words = sentence.split(" ");
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
                }
                else
                    typeNames.push(words[1].substring(0, words[1].indexOf("{")).trim().replace('\t', ''));
            }
        }
        // if the first word says ".needs", import the module
        if (words[0].trim().replace('\t', '') == ".needs") {
            // Check for quotes
            if (sentence.indexOf('"') > -1) {
                let moduleName = sentence.substring(sentence.indexOf('"') + 1, sentence.lastIndexOf('"'));

                // Find the module in the head folder
                let modulePath = homeDir + "/head"+ "/" + moduleName;
                if (modulePath.indexOf(".gs") === -1) {
                    modulePath += ".gs";
                }
                if (fs.existsSync(modulePath)) {
                    let moduleText = fs.readFileSync(modulePath).toString();
                    symbols = symbols.concat(getSymbols(moduleText));
                }
            }
        };
    }
    ;
    return symbols;
}
exports.getSymbols = getSymbols;
