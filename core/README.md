# SolCalc Core Engine

Pure TypeScript engine for audit-grade mixed-decimal arithmetic.

## Purpose

This package provides mechanically correct integer arithmetic with explicit decimal tracking, designed for smart contract audit calculations.

## Key Principles

1. **All math is bigint** - No floating point, ever
2. **Decimals are explicit** - No inference, no assumptions
3. **Boring is correct** - If it feels clever, it's wrong
4. **Fail fast** - Invalid operations throw immediately

## Features

- ✅ Mixed-decimal arithmetic (6, 8, 18, 27 decimals)
- ✅ Strict decimal propagation rules
- ✅ Restricted exponentiation (`10 ** n` only)
- ✅ Floor and ceiling rounding modes
- ✅ Comprehensive error messages
- ✅ 79 tests covering edge cases

## Installation

```bash
npm install
npm run build
npm test
```

## API

### Main Functions

```typescript
import { evaluateExpression, extractVariables } from '@solcalc/core';

// Evaluate an expression
const result = evaluateExpression(
  'amount * price / 1e18',
  new Map([
    ['amount', { name: 'amount', value: 1000000n, decimals: 18 }],
    ['price', { name: 'price', value: 2000000000000000000n, decimals: 18 }],
  ])
);

// Extract variables from expression
const vars = extractVariables('amount * price / 1e18');
// Returns: Set(['amount', 'price'])
```

### Types

```typescript
interface Variable {
  name: string;
  value: bigint;      // Raw integer value
  decimals: number;   // Decimal scale (>= 0)
}

interface EvaluationResult {
  raw: bigint;            // Raw result
  decimals: number;       // Result decimal scale
  human: string;          // Formatted decimal string
  solidity: bigint;       // After rounding
  roundingLoss: string;   // Loss from rounding
}
```

## Arithmetic Rules

### Decimal Propagation

- **Multiplication**: decimals add
  - `(18 decimals) * (6 decimals) = 24 decimals`
- **Division**: decimals subtract
  - `(18 decimals) / (6 decimals) = 12 decimals`
- **Addition/Subtraction**: decimals must match
  - `(18 decimals) + (6 decimals) = ERROR`

### Exponentiation

**ONLY** `10 ** n` is allowed where:
- Base must be literal `10`
- Exponent `n` must be dimensionless (decimals = 0)

```typescript
// Valid
10 ** 18
10 ** n  // where n has decimals = 0

// Invalid
x ** 2
2 ** n
10 ** amount  // if amount has decimals > 0
```

## Error Handling

```typescript
// Decimal mismatch
evaluateExpression('a + b', vars);
// Throws: DecimalMismatchError

// Invalid exponentiation
evaluateExpression('x ** 2', vars);
// Throws: InvalidExponentiationError

// Division by zero
evaluateExpression('a / 0', vars);
// Throws: DivisionByZeroError

// Undefined variable
evaluateExpression('a + b', new Map([['a', ...]]));
// Throws: UndefinedVariableError
```

## Test Coverage

- **17 tests** - Tokenizer (numbers, identifiers, operators, scientific notation)
- **21 tests** - Parser (precedence, associativity, parentheses, errors)
- **27 tests** - Evaluator (arithmetic, decimals, rounding, edge cases)
- **14 tests** - Golden cases (ERC4626, Uniswap, Aave, real audit patterns)

Run tests:
```bash
npm test
```

## Architecture

```
core/
├── src/
│   ├── types.ts              # Type definitions
│   ├── parser/
│   │   ├── tokenize.ts       # Lexical analysis
│   │   └── parse.ts          # AST generation
│   ├── evaluator/
│   │   ├── decimals.ts       # Decimal propagation
│   │   ├── rounding.ts       # Floor/ceil logic
│   │   └── evaluate.ts       # Main evaluator
│   └── index.ts              # Public API
└── tests/
    ├── tokenize.test.ts
    ├── parse.test.ts
    ├── evaluate.test.ts
    └── golden.test.ts        # Real audit scenarios
```

## Design Philosophy

This engine is **mechanically honest**. It:
- Makes decimals explicit
- Makes rounding visible
- Makes scale mismatches detectable
- Makes calculations reproducible

It does **not**:
- Infer decimals
- Guess intent
- Fix mistakes
- Hide behavior

## License

MIT
