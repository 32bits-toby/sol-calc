# SolCalc VS Code Extension

Mixed-Decimal Calculator for Solidity Audits

## Features

- **Mixed-Decimal Arithmetic**: Evaluate expressions with different decimal precisions
- **Floor/Ceil Rounding**: Choose between floor (round down) and ceil (round up) modes
- **Loss Tracking**: See exactly how much precision is lost in division operations
- **Scale Constants**: Support for `1e18`, `10 ** n` patterns common in DeFi
- **Variable Support**: Define variables with explicit decimal precision
- **Audit-Grade Guidelines**: 38 comprehensive guidelines covering DeFi patterns and audit pitfalls
- **Dark/Light Themes**: Matches VS Code's theme

## Usage

1. Open the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows/Linux)
2. Type "SolCalc" and select "Open SolCalc Calculator"
3. Enter your expression and define variables
4. View results with decimal precision and rounding loss

## Development

### Building the Extension

From the project root:

```bash
# Install all dependencies
npm run install:all

# Build everything (core, UI, extension)
npm run build
```

Or build individually:

```bash
# Build core engine
npm run build:core

# Build UI for extension
npm run build:ui

# Compile extension
npm run build:extension
```

### Testing the Extension

1. Open the `extension` directory in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new VS Code window, open Command Palette and run "Open SolCalc Calculator"

Alternatively, you can:
- Run > Start Debugging (F5)
- Or use the "Run Extension" configuration from the Debug panel

### Debugging

- Set breakpoints in `src/extension.ts` or `src/webviewProvider.ts`
- Press F5 to start debugging
- Check the Debug Console for logs

## Extension Structure

```
extension/
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript config
├── src/
│   ├── extension.ts      # Entry point
│   └── webviewProvider.ts # Webview manager
├── dist/                 # Compiled extension code
└── webview/              # Built React UI
    ├── index.html
    └── assets/
```

## Publishing

To package the extension for distribution:

```bash
cd extension
npm run package
```

This creates a `.vsix` file that can be installed or published to the marketplace.

## License

MIT
