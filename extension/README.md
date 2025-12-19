# SolCalc VS Code Extension

**Mixed-Decimal Calculator for evm Audits**

SolCalc is a developer utility that helps smart contract auditors and evm developers verify arithmetic operations with explicit decimal tracking. It mimics evm's integer-only arithmetic while showing precision loss, rounding behavior, and decimal propagation.

## Why SolCalc?

evm doesn't have floating-point types. All token amounts are stored as integers with an implied decimal place. For example:
- 1 USDC (6 decimals) = `1000000`
- 1 ETH (18 decimals) = `1000000000000000000`

SolCalc helps you verify calculations across different decimal precisions without manual conversion, catching precision loss bugs before they make it to production.

## Features

### Core Functionality
- **BigInt-Only Arithmetic**: No floating-point operations, matching evm exactly
- **Mixed-Decimal Support**: Work with values of different decimal precisions (USDC 6, WETH 18, etc.)
- **Floor/Ceil Rounding**: Choose rounding mode and see the impact on results
- **Loss Calculation**: See exactly how much value is lost due to rounding
- **Scale Constants**: Support for `1e18`, `1e6`, `10 ** n` patterns common in DeFi
- **Variable Support**: Define variables with explicit values and decimals

### Built-in Guidelines
38 comprehensive guidelines covering:
- DeFi patterns (ERC4626, WAD/RAY math, BPS)
- Audit pitfalls to watch for
- Common bugs and how to avoid them
- Best practices for decimal arithmetic

### Privacy & Security
- **100% Local**: All calculations run locally in VS Code
- **No Network Access**: No data is sent anywhere
- **No Telemetry**: No usage tracking or analytics
- **Open Source**: Full source code available on GitHub

## How to Use

1. **Open SolCalc**: Click the calculator icon in the Activity Bar (left sidebar)
2. **Enter Expression**: Type your arithmetic expression (e.g., `(price * amount) / 1e18`)
3. **Define Variables**: If your expression has variables, enter their values and decimal precision
4. **View Results**: See the result in raw, human-readable, and wvm formats, plus any precision loss

### Example Use Cases

**Verify vault share conversions:**
```
shares * totalAssets / totalShares
```

**Check price calculations:**
```
(1500 * 1e18) * (10 * 1e18) / 1e18
```

**Test division rounding:**
```
(3 * 1e18) / 7
```

## Architecture

SolCalc consists of three components:

1. **Core Engine** (`@solcalc/core`): Pure TypeScript arithmetic engine using BigInt
2. **React UI**: Calculator interface with theme support
3. **VS Code Extension**: Webview host for the calculator

The webview contains a pre-built React application (bundled JavaScript and CSS) that provides the calculator interface. No dynamic code execution or external resources are loaded.

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
