import { Type, Signature } from './Parser';
import { extractFunction, extractClassText, extractSymbols, extractFunctions, createTypeFromClass } from './LanguageTools';
const CLASS2TEXT = `class Test2 {
    int a;
    public int addThat(int a, int b) {
        return a + b;
    };
};`;
const mockText = `
class Test {
    int a = 0;
    public int addThis(int a, int b) {
        return a + b;
    };
};

${CLASS2TEXT}

export int add(int a, int b) {
    return a + b;
};

export int sub(int a, int b) {
    return a - b;
};

int notExported(int a, int b) {
    return a - b;
};

private int notFound(int a, int b) {
    return a - b;
};
`;
const symbolText = `int a = 0; int b = 0;`;
const intType: Type = {
    ident: 'int',
    symbols: [],
    functions: [],
};

const typeList: Type[] = [intType];

describe('LanguageTools', () => {

    beforeEach(() => {
        // mock the vscode module
        jest.mock('vscode', () => ({
            window: {
                showErrorMessage: jest.fn(),
                showInformationMessage: jest.fn(),
                showWarningMessage: jest.fn(),
                showInputBox: jest.fn(),
            },
            MarkdownString: jest.fn(),
        }));
    });

    describe('extractFunction', () => {
        
        it('should return a function signature', () => {
            const res = extractFunction(mockText, 'add', 'Test');
            expect(res.data).toEqual({
                ident: 'add',
                returnType: 'int',
                moduleName: 'Test',
                params: ['int a', 'int b'],
                doc: undefined,
            });
        });

        it('should return an error message', () => {
            const res = extractFunction(mockText, 'notFound', 'Test');
            expect(res.error).toEqual('Function notFound not found');
        });

        it('should not find a function signature if it is in a class', () => {
            const res = extractFunction(mockText, 'addThis', 'Test');
            expect(res.error).toEqual('Function addThis not found');
        });

        it('should adhere to export only', () => {
            const res = extractFunction(mockText, 'notExported', 'Test', true);
            expect(res.error).toEqual('Function notExported not found');
        });

        it('should never find a private function', () => {
            const alowNotExport = extractFunction(mockText, 'notFound', 'Test');
            expect(alowNotExport.error).toEqual('Function notFound not found');

            const exportsOnly = extractFunction(mockText, 'notFound', 'Test', true);
            expect(exportsOnly.error).toEqual('Function notFound not found');
        });
    });

    describe('extractClassText', () => {
        it('should return the text of a class', () => {
            const res = extractClassText(mockText, 'Test2');
            expect(res.data).toEqual(CLASS2TEXT);
        });
        it('should return an error message', () => {
            const res = extractClassText(mockText, 'Test3');
            expect(res.error).toEqual('Class Test3 not found');
        });
    });

    describe('extractSymbols', () => {
        it('should return a list of symbols', () => {
            const res = extractSymbols(symbolText, typeList);
            expect(res.data).toEqual([{
                ident: 'a',
                type: intType,
            }, {
                ident: 'b',
                type: intType,
            }]);
        });

        it('should not extract private symbols', () => {
            const res = extractSymbols('private int a = 0;', typeList);
            expect(res.data).toEqual([]);
        });

    });

    describe('extractFunctions', () => {
        it('should return a list of functions', () => {
            const res = extractFunctions(mockText, 'Test', true);
            // should be a list
            expect(Array.isArray(res.data)).toBe(true);
            // should have 2 functions
            const data = res.data as Signature[];
            expect(data.length).toBe(2);
        });
    });

    describe('createTypeFromClass', () => {
        it('should return a type from a class', () => {
            const res = createTypeFromClass('Test2', CLASS2TEXT, typeList);
            console.log(res);
            expect(res.functions.length).toBe(1);
            expect(res.symbols.length).toBe(1);
        });
    });
});