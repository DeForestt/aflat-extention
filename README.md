# AFlat Extension for Visual Studio Code

This extension, named "AFlat", is designed for the AFlat programming language, providing enhanced support and features within Visual Studio Code.

## Features

- **Syntax Highlighting**: Leveraging the `aflat.tmLanguage.json`, the extension offers syntax highlighting for AFlat language files, making it easier to read and write code.
- **Semantic Tokenization**: The `SemanticTokenizer.ts` module provides semantic tokenization, which helps in understanding the code structure and context.
- **Error Checking**: The `ErrorChecker.ts` module helps in identifying and highlighting potential errors in the code.
- **Signature Help**: With `SignatureHelpProvider.ts`, the extension offers signature help for functions, improving the coding experience.
- **Command Integration**: The extension integrates commands like `aflat.run`, `aflat.test`, and `aflat.build` into the VS Code editor, allowing for quick actions directly from the editor.

## Requirements

- Visual Studio Code version 1.61.0 or higher.
- Dependencies are managed via `package.json`, ensuring easy setup and configuration.

## Installation and Setup

1. Clone the repository or download the extension package.
2. Follow the instructions in `vsc-extension-quickstart.md` for setting up the extension in Visual Studio Code.

## Extension Settings

This extension contributes to the following settings:

- `aflat.stddir`: Specifies the folder path containing the tsserver and lib*.d.ts files to use.

## Known Issues

Refer to the `CHANGELOG.md` for known issues and updates on bug fixes.

## Contributing

Contributions to the AFlat extension are welcome. Please refer to the repository's guidelines for contributing.

## License

[Specify the license or link to it]

---

**Note**: This is a template based on the current repository structure and content. You may need to adjust or add more details specific to the AFlat extension.
