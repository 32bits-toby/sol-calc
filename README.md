# SolCalc

**Mixed-Decimal Calculator for Solidity Audits**

SolCalc is a VS Code extension that helps smart contract auditors verify arithmetic operations with explicit decimal tracking. It mimics Solidity's integer-only arithmetic while showing precision loss, rounding behavior, and decimal propagation.

## Features

- **BigInt-Only Arithmetic**: No floating-point operations, matching Solidity's behavior exactly
- **Decimal Tracking**: Explicit decimal precision for every value and operation
- **Mixed-Decimal Support**: Work with values of different decimal precisions (USDC 6, WETH 18, etc.)
- **Floor/Ceil Rounding**: Choose rounding mode and see the impact on results
- **Loss Calculation**: See exactly how much value is lost due to rounding
- **Scale Constants**: Support for `1e18`, `1e6`, `10 ** n` patterns
- **Variable Support**: Define variables with explicit values and decimals
- **Auto-Lifting**: Scalar literals automatically adapt in addition/subtraction
- **Comprehensive Guidelines**: 38 guidelines covering DeFi patterns, audit pitfalls, and best practices
- **Theme Support**: Dark and light modes matching VS Code

## Use Cases

- Verify vault share-to-asset conversions (ERC4626)
- Check price × amount calculations
- Validate interest accrual formulas (WAD/RAY math)
- Test basis point fee calculations
- Identify precision loss in complex expressions
- Audit multi-token interactions with different decimals

## Project Structure

```
sol-calc/
├── core/              # BigInt arithmetic engine
│   ├── src/
│   │   ├── tokenizer/ # Expression tokenization
│   │   ├── parser/    # AST generation
│   │   ├── evaluator/ # Evaluation with decimal tracking
│   │   └── types.ts   # Core types
│   └── tests/         # 79 comprehensive tests
│
├── ui/                # React calculator interface
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── data/        # Guideline content
│   │   ├── state/       # React Context store
│   │   └── styles/      # CSS with theme support
│   └── dist/            # Built UI (for web)
│
└── extension/         # VS Code extension
    ├── src/
    │   ├── extension.ts       # Entry point
    │   └── webviewProvider.ts # Webview manager
    ├── dist/          # Compiled extension
    └── webview/       # Built UI (for extension)
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- VS Code (for extension development)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd sol-calc

# Install all dependencies
npm run install:all

# Build everything
npm run build
```

### Development Workflows

#### 1. Develop the UI (Standalone Web App)

```bash
cd ui
npm run dev
```

Open http://localhost:5173 in your browser.

#### 2. Develop the Extension

```bash
# Build UI for extension
cd ui
npm run build:extension

# Compile extension
cd ../extension
npm run compile

# Test in VS Code
# Open the extension directory in VS Code and press F5
```

#### 3. Run Tests

```bash
cd core
npm test
```

## Architecture

### Core Engine

- **Tokenizer**: Parses expressions into tokens (numbers, operators, variables, parentheses)
- **Parser**: Builds an Abstract Syntax Tree (AST) with operator precedence
- **Evaluator**: Executes AST with BigInt arithmetic and decimal tracking
- **Decimal Rules**:
  - Multiplication: decimals add (18 + 18 = 36)
  - Division: decimals subtract (36 - 18 = 18)
  - Addition/Subtraction: decimals must match (or scalar auto-lifts)
  - Exponentiation: Only `10 ** n` where n has decimals=0

### UI Layer

- **React + TypeScript**: Type-safe component architecture
- **Vite**: Fast development and optimized builds
- **CSS Variables**: Theme switching without rebuilding
- **React Context**: Simple, centralized state management

### Extension Layer

- **Webview API**: Hosts React UI in VS Code panel
- **Command Registration**: `solcalc.open` command
- **CSP Compliance**: Content Security Policy for webviews

## Key Concepts

### Fixed-Point Representation

```typescript
// Human: 2.5 USDC
// Storage: {value: 2500000n, decimals: 6}

// Human: 1.0 ETH
// Storage: {value: 1000000000000000000n, decimals: 18}
```

### Decimal Propagation

```typescript
// Multiplication adds decimals
(2 * 1e18) * (3 * 1e18) = 6 * 1e36  // 18 + 18 = 36

// Division subtracts decimals
(6 * 1e36) / (3 * 1e18) = 2 * 1e18  // 36 - 18 = 18

// Scaling down
(price * amount) / 1e18  // Restore to token decimals
```

### Rounding Modes

```typescript
// Floor (default Solidity behavior)
7 / 2 = 3  // User loses 0.5

// Ceil (fair rounding)
7 / 2 = 4  // Protocol loses 0.5
```

## Guidelines

SolCalc includes 38 comprehensive guidelines covering:

1. **Getting Started**: Understanding fixed-point math
2. **Core Decimal Rules**: Multiplication, division, addition rules
3. **Powers & Scaling**: Scale constants and dynamic exponentiation
4. **Rounding & Loss**: Floor vs Ceil, loss calculation
5. **Variables & Literals**: Variable definitions, scalar auto-lifting
6. **Common DeFi Patterns**: Shares-to-assets, price calculations, Ray math, BPS
7. **Limitations**: What SolCalc doesn't support
8. **Audit Pitfalls**: Common bugs to watch for
9. **Advanced**: Overflow checking, gas optimization, signed arithmetic

Access guidelines via the "Guide ?" button in the toolbar.

## Building for Production

### Build Everything

```bash
# From project root
npm run build
```

This builds:
1. Core engine (`core/dist`)
2. UI for extension (`extension/webview`)
3. Extension code (`extension/dist`)

### Package Extension

```bash
cd extension
npm run package
```

Creates `solcalc-0.1.0.vsix` for distribution.

### Install Packaged Extension

```bash
code --install-extension solcalc-0.1.0.vsix
```

## Testing

### Core Engine Tests

```bash
cd core
npm test
```

79 tests covering:
- Tokenization
- Parsing
- Evaluation
- Decimal propagation
- Rounding modes
- Error handling
- Edge cases

### Manual Testing

1. **Web UI**: Test at http://localhost:5173
2. **Extension**: Test in Extension Development Host (F5)
3. **Test Cases**:
   - Basic arithmetic: `(2 * 1e18) * (3 * 1e18) / 1e18`
   - Mixed decimals: `x (USDC 6) * y (ETH 18)`
   - Rounding: `7 / 2` (Floor vs Ceil)
   - Loss: `(3 * 1e18) / 7`
   - Guidelines: Navigate through all 38 entries

## Troubleshooting

### UI Shows White Screen

- Check browser console for errors
- Ensure core package is built: `cd core && npm run build`
- Clear cache and rebuild: `rm -rf node_modules dist && npm install && npm run build`

### Extension Not Loading

- Ensure webview directory exists: `ls extension/webview`
- Rebuild UI: `cd ui && npm run build:extension`
- Check Extension Development Host console

### TypeScript Errors

- Ensure all dependencies are installed
- Rebuild core: `cd core && npm run build`
- Check tsconfig.json in each package

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `cd core && npm test`
5. Build everything: `npm run build`
6. Submit a pull request

## License

MIT

## Acknowledgments

Built for smart contract auditors who need precise, verifiable calculations with explicit decimal tracking.
