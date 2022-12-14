import { Type } from './Parsing/Parser';
export const RETURN_TYPES: string[] = [
    'void',
    'any',
    'int',
    'adr',
    'bool',
    'byte',
    'char',
    'float',
    'short',
    'long',
    'generic',
];

export const TYPES: Type[] = RETURN_TYPES.map((type: string) => ({
    ident: type,
    functions: [],
    symbols: [],
}));

export const CONNECTING_CHAR_REGEX = /[a-zA-Z0-9_]/;
export const NOT_CONNECTING_CHAR_REGEX = /[^a-zA-Z0-9_]/;