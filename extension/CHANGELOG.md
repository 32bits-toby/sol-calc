# Change Log

All notable changes to the SolCalc extension will be documented in this file.

## [0.1.0] - 2025-12-15

### Initial Release

#### Added
- BigInt-only arithmetic engine for evm-accurate calculations
- Mixed-decimal support for different token precisions (USDC 6, WETH 18, etc.)
- Floor and Ceil rounding modes
- Precision loss tracking for division operations
- Support for scale constants (`1e18`, `1e6`, `10 ** n`)
- Variable support with explicit decimal precision
- 38 comprehensive audit guidelines covering:
  - Core decimal rules
  - DeFi patterns (ERC4626, WAD/RAY, BPS)
  - Common audit pitfalls
  - Best practices
- Dark and light theme support matching VS Code
- Sidebar panel integration
- Auto-evaluation with debouncing
- Human-readable value input

#### Features
- Calculator icon in Activity Bar for easy access
- Expression input with variable detection
- Real-time result display showing:
  - Raw BigInt value
  - Human-readable decimal value
  - evm-compatible representation
  - Precision loss (when applicable)
- Guidelines panel with searchable categories
- Completely offline - no network access
- No telemetry or data collection

#### Technical
- Built with TypeScript for type safety
- React-based UI with Vite bundling
- Core arithmetic engine as separate package
- Comprehensive test suite (79 tests)
