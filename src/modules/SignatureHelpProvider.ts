import { legend } from './SemanticTokenizer';
import { NameSets, Signature } from './Parser';
import * as vscode from 'vscode';

export class AflatSignatureHelpProvider implements vscode.SignatureHelpProvider {
    names : NameSets
    constructor(names : NameSets) {
        this.names = names;
    }
    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {
        const line = document.lineAt(position.line).text;
        const lineTillCurrentPosition = line.substr(0, position.character);

        const functionName = lineTillCurrentPosition.split('(')[0].trim();
        const functionSignatures = this.names.functionSignatures;
        const fn2 = functionName.split(/[\s\.]+/)[functionName.split(/[\s\.]+/).length - 1];
        
        if (functionSignatures) for (const sig of functionSignatures) {
            if (sig.ident === fn2) {
                const signatureHelp = new vscode.SignatureHelp();
                const signature = new vscode.SignatureInformation(`${sig.ident}(${sig.params?.join(', ')})`);
                signatureHelp.signatures.push(signature);
                if (sig.params) for (const param of sig.params) {
                    const paramInfo = new vscode.ParameterInformation(param.trim());
                    signature.parameters.push(paramInfo);
                }
                signatureHelp.activeSignature = 0;
                signatureHelp.activeParameter = lineTillCurrentPosition.split(',').length - 1;
                return signatureHelp;
            }
        };
        return undefined;
    }
}