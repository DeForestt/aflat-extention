"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providers = void 0;
const vscode = require("vscode");
const ParseAflat_1 = require("./ParseAflat");
const reservedWords = [
    "int",
    "float",
    "adr",
    "short",
    "return",
    "as",
    "if",
    "else",
    "while",
    "for",
    "public",
    "private",
    "class",
];
exports.providers = [
    keywords, symbols
];
