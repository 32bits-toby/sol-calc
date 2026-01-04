# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SolCalc is a mixed-decimal calculator for smart contract audits, available as both a VS Code extension and standalone web app. It performs BigInt-only arithmetic with explicit decimal tracking, matching Solidity's behavior exactly.

**Key Principle**: All math is bigint. No floating point, ever. Decimals are explicit, never inferred.

## Build Commands

### Root Commands (Most Common)
```bash
npm run build              # Build everything (core + UI + extension)
npm run build:core         # Build core engine only
npm run build:ui          # Build UI for extension
npm run build:extension   # Compile extension TypeScript
npm run install:all       # Install all dependencies
```

### Core Engine
```bash
cd core
npm run build             # Compile TypeScript to dist/
npm test                  # Run 173 comprehensive tests
npm run test:watch        # Watch mode for tests
```

### UI (React)
```bash
cd ui
npm run dev                  # Dev server at localhost:5173
npm run build               # Build for web (to dist/)
npm run build:extension     # Build for extension (to ../extension/webview/)
npm run lint               # TypeScript type checking
```

### Extension
```bash
cd extension
npm run compile            # Compile TypeScript to dist/
npm run watch             # Watch mode
npm run package           # Create .vsix package
```

## Architecture

### Multi-Package Monorepo Structure

```
sol-calc/
├── core/                  # Pure TypeScript arithmetic engine
│   ├── src/
│   │   ├── parser/
│   │   │   ├── tokenize.ts    # Lexical analysis
│   │   │   └── parse.ts       # AST generation
│   │   ├── evaluator/
│   │   │   ├── decimals.ts    # Decimal propagation rules
│   │   │   ├── rounding.ts    # Floor/ceil division
│   │   │   └── evaluate.ts    # Main evaluation engine
│   │   ├── types.ts           # Core type definitions
│   │   └── index.ts           # Public API
│   └── tests/                  # 173 tests
│
├── ui/                    # React calculator interface
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── data/              # Guideline content
│   │   ├── state/             # React Context store
│   │   └── styles/            # CSS with dark/light themes
│   └── dist/                  # Built for web
│
└── extension/            # VS Code extension wrapper
    ├── src/
    │   ├── extension.ts           # Entry point
    │   └── webviewProvider.ts     # Webview manager
    ├── webview/                   # Built UI (from /ui)
    └── dist/                      # Compiled extension code
```

### Build Dependencies

**Critical**: The build order matters:
1. `core` must be built first (UI and extension depend on it)
2. `ui` must be built for extension before packaging
3. `extension` compilation is final step

The core engine is an ES module (`"type": "module"` in package.json) for browser/webview compatibility.

## Core Engine Concepts

### Decimal Propagation Rules

- **Multiplication**: decimals add
  - `(18 decimals) * (6 decimals) = 24 decimals`
- **Division**: decimals subtract
  - `(36 decimals) / (18 decimals) = 18 decimals`
- **Addition/Subtraction**: decimals must match
  - Exception: scalar literals (plain integers) auto-lift in +/- operations

### Scale Constants

Scientific notation creates implicit decimals:
```typescript
1e18 → {value: 10^18, decimals: 18}
2.5e6 → {value: 2500000, decimals: 6}
```

### Exponentiation Restriction

**ONLY** `10 ** n` is allowed where:
- Base must be literal `10`
- Exponent `n` must have decimals = 0 (dimensionless)

This is intentional to match Solidity constraints.

### Rounding Modes

- **Floor** (default): Rounds down, matches Solidity division behavior
- **Ceil**: Rounds up using formula `(a + b - 1n) / b` when remainder exists

### Comparison Operators

Comparisons (==, !=, <, <=, >, >=) support auto-normalization:
- If operands have different decimals, normalize to higher precision
- Returns `ComparisonResult` (boolean) instead of `EvaluationResult` (numeric)
- Two-phase evaluation: Phase 1 (numeric) → Phase 2 (boolean comparison)

This handles edge cases like `type(uint256).max / 1e18` (which has negative decimals).

## UI State Management

Uses React Context for centralized state (`ui/src/state/store.tsx`):
- Expression parsing and evaluation
- Variable definitions (name, value, decimals)
- Rounding mode (floor/ceil)
- Theme (dark/light)
- Guideline modal visibility

**Human-Readable Input**: Users enter "2" with decimals "18" → auto-converts to `2 × 10^18` internally.

## TypeScript Configuration

All packages use **strict mode** with comprehensive type checking:
- `strict: true`
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true`
- All strict flags enabled

When modifying code, maintain this strictness level.

## Testing

Core engine has 173 tests covering:
- Tokenization (17 tests)
- Parsing (21 tests)
- Evaluation (27 tests)
- Comparison operators (24 tests)
- Golden cases - real audit patterns (14 tests)

**Test Command**: `cd core && npm test` (uses Node's built-in test runner)

Always run tests after modifying core engine logic.

## VS Code Extension Details

### Webview Integration

The extension uses `WebviewViewProvider` for sidebar integration (not `createWebviewPanel`). This makes it persistent in the Activity Bar like the Chat panel.

### Content Security Policy

The webview has CSP restrictions. All UI assets must be served via proper webview URIs with `asWebviewUri()`.

### Activation

Extension activates when the calculator view is opened (`onView:solcalc.calculatorView`).

## Common Development Tasks

### Modifying Core Logic

1. Edit files in `core/src/`
2. Run `cd core && npm run build`
3. Run `cd core && npm test` to verify
4. Rebuild UI if it imports changed APIs: `cd ui && npm run build:extension`

### Modifying UI

1. Edit files in `ui/src/`
2. Test in web mode: `cd ui && npm run dev` (faster iteration)
3. Build for extension: `cd ui && npm run build:extension`
4. Test in VS Code: Press F5 in extension directory

### Adding New Guidelines

Guidelines are in `ui/src/data/guidelines.ts` as a TypeScript array. Each guideline has:
- `id`: Unique identifier
- `section`: Category name
- `title`: Short title
- `content`: Markdown/HTML content
- `example`: Optional code example

### Modifying Decimal Rules

Decimal logic is centralized in `core/src/evaluator/decimals.ts`. Changes here affect all arithmetic operations.

### Testing Extension Locally

```bash
# Build everything
npm run build

# Package extension
cd extension
npm run package

# Install locally
code --install-extension solcalc-0.1.0.vsix
```

## Terminology Notes

Recent commit (a8c3b0c) updated terminology from "Solidity" to "EVM" in documentation and metadata to better reflect the tool's scope.

## Web Application Deployment

The UI can be deployed as a standalone web app:
1. `cd ui && npm run build` creates optimized build in `dist/`
2. Deploy `dist/` to any static hosting (Vercel, Netlify, GitHub Pages, etc.)
3. No backend required - entirely client-side

## Key Files to Understand

- `core/src/evaluator/evaluate.ts` - Main evaluation engine with all arithmetic logic
- `core/src/types.ts` - Core type definitions (Variable, EvaluationResult, etc.)
- `ui/src/state/store.tsx` - React Context state management
- `ui/src/data/guidelines.ts` - All guideline content
- `extension/src/webviewProvider.ts` - Webview lifecycle management

## Design Philosophy

This codebase prioritizes **mechanical correctness** over convenience:
- Explicit > Implicit (decimals never inferred)
- Fail fast > Silent errors (invalid operations throw immediately)
- Boring > Clever (if it feels clever, it's probably wrong)
- Visible > Hidden (rounding and loss are always shown)

When making changes, maintain this philosophy.
