import { extractFunction } from './LanguageTools';

const mockText = `
class Test {
    int a;
    public int addThis(int a, int b) {
        return a + b;
    };
};

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
            expect(res).toEqual({
                ident: 'add',
                returnType: 'int',
                moduleName: 'Test',
                params: ['int a', 'int b'],
                doc: undefined,
            });
        });

        it('should return an error message', () => {
            const res = extractFunction(mockText, 'notFound', 'Test');
            expect(res).toEqual({message: 'Function notFound not found'});
        });

        it('should not find a function signature if it is in a class', () => {
            const res = extractFunction(mockText, 'addThis', 'Test');
            expect(res).toEqual({message: 'Function addThis not found'});
        });

        it('should adhere to export only', () => {
            const res = extractFunction(mockText, 'notExported', 'Test', true);
            expect(res).toEqual({message: 'Function notExported not found'});
        });

        it('should never find a private function', () => {
            const alowNotExport = extractFunction(mockText, 'notFound', 'Test');
            expect(alowNotExport).toEqual({message: 'Function notFound not found'});

            const exportsOnly = extractFunction(mockText, 'notFound', 'Test', true);
            expect(exportsOnly).toEqual({message: 'Function notFound not found'});

            
        });
    });
});