# SolCalc - Development Progress

**Last Updated**: December 16, 2025
**Status**: ✅ Complete - Ready for Deployment (VS Code Extension + Web App)

---

## Project Overview

SolCalc is a mixed-decimal calculator for Solidity audits, available as both a VS Code extension and a standalone web application. It performs BigInt-only arithmetic with explicit decimal tracking, matching Solidity's behavior exactly.

---

## ✅ Completed Work

### 1. Core Engine (`/core`)
**Status**: ✅ Complete and tested

- **Tokenizer**: Parses expressions into tokens
  - Supports: numbers, operators (+, -, *, /, **), variables, parentheses
  - Handles scientific notation (1e18, 2.5e6)

- **Parser**: Builds AST with operator precedence
  - Proper precedence: ** > * / > + -
  - Parentheses grouping support

- **Evaluator**: BigInt-only arithmetic with decimal tracking
  - Multiplication: decimals add (18 + 18 = 36)
  - Division: decimals subtract (36 - 18 = 18)
  - Addition/Subtraction: decimals must match (or scalar auto-lifts)
  - Exponentiation: Only `10 ** n` where n has decimals=0

- **Key Features**:
  - Scale constants: `1e18` → {value: 10^18, decimals: 18}
  - Dynamic exponentiation: `10 ** (decimals - 6)`
  - Scalar literal auto-lifting: `1e18 + 1` works intuitively
  - Floor vs Ceil rounding modes
  - Division loss tracking with 50-digit precision

- **Tests**: 148 comprehensive tests, all passing ✅

### 2. React UI (`/ui`)
**Status**: ✅ Complete with full feature set

**Components**:
- `App.tsx`: Main layout with theme toggle
- `Toolbar.tsx`: Rounding selector + Guide button
- `Expression.tsx`: Expression input with placeholder
- `Variables.tsx`: Auto-detected variable inputs
- `Results.tsx`: Display raw/human/solidity values + loss
- `Footer.tsx`: Credits and links
- `Guideline.tsx`: Modal with 38 guidelines (index + content views)

**State Management**:
- React Context (`state/store.tsx`)
- Human-readable input conversion (user enters "2" → converts to 2×10^decimals)
- Auto-evaluation with 300ms debounce
- Theme persistence to localStorage

**Styling**:
- Dark theme: VS Code Dark+ colors
- Light theme: VS Code Light+ colors
- CSS variables for theme switching
- Responsive design
- Webapp mode: Centered layout with 800px max-width
- Visual depth with box-shadow and contrasting page background

**Guidelines**:
- 38 comprehensive entries across 9 sections:
  1. Getting Started (4)
  2. Core Decimal Rules (5)
  3. Powers & Scaling (4)
  4. Rounding & Loss (5)
  5. Variables & Literals (4)
  6. Common DeFi Patterns (4)
  7. Limitations (4)
  8. Audit Pitfalls (4)
  9. Advanced (4)

### 3. VS Code Extension (`/extension`)
**Status**: ✅ Complete - Awaiting Marketplace Approval

**Structure**:
- `extension.ts`: Entry point, registers webview view provider
- `webviewProvider.ts`: Manages sidebar webview
- `package.json`: Extension manifest with full metadata
- `resources/icon.svg`: Activity bar icon
- `icon.png`: Marketplace icon
- `.vscode/launch.json`: Debug configuration
- `.vscode/tasks.json`: Build tasks

**Extension Features**:
- Sidebar view (Activity Bar integration)
- Webview hosts built React UI
- Retains state when hidden
- CSP compliant
- No network access, no telemetry

**Metadata** (for marketplace trust):
- ✅ Repository, homepage, bugs URLs
- ✅ License: MIT
- ✅ Q&A channel
- ✅ Capabilities: untrustedWorkspaces supported
- ✅ Gallery banner
- ✅ Comprehensive README
- ✅ CHANGELOG.md

**Build Optimizations**:
- Bundle splitting: React vendor (139.5 KB) + app code (43 KB)
- Terser minification with console removal
- Source maps included
- Total: ~182 KB (optimized)

---

## 🏗️ Architecture

```
sol-calc/
├── core/                    # BigInt arithmetic engine
│   ├── src/
│   │   ├── tokenizer/      # Lexical analysis
│   │   ├── parser/         # AST generation
│   │   ├── evaluator/      # Evaluation engine
│   │   └── types.ts        # Core type definitions
│   ├── tests/              # 148 comprehensive tests
│   └── dist/               # Built engine (ES modules)
│
├── ui/                      # React calculator UI
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── data/           # Guideline content
│   │   ├── state/          # React Context store
│   │   └── styles/         # CSS with themes
│   └── dist/               # Built for web
│
└── extension/              # VS Code extension
    ├── src/
    │   ├── extension.ts    # Entry point
    │   └── webviewProvider.ts
    ├── webview/            # Built React UI (from /ui)
    ├── dist/               # Compiled extension code
    └── resources/          # Icons
```

---

## 🔑 Key Technical Decisions

### 1. ES Modules for Core
- **Decision**: Changed core from CommonJS to ES modules
- **Reason**: Browser/webview compatibility (Chromium-based)
- **Implementation**:
  - `tsconfig.json`: `"module": "ES2020"`
  - `package.json`: `"type": "module"`

### 2. Human-Readable Input
- **Decision**: User enters "2" with decimals "18" → auto-converts to 2×10^18
- **Reason**: Matches how users think about token amounts
- **Implementation**: `parseFloat(input) × 10^decimals → BigInt`

### 3. Scale Constants
- **Decision**: `1e18` → {value: 10^18, decimals: 18}
- **Reason**: Matches Solidity's literal handling
- **Implementation**: Special case in `parseNumberLiteral()`

### 4. Scalar Literal Auto-Lifting
- **Decision**: Plain integers auto-lift in +/- operations only
- **Reason**: Makes `1e18 + 1` work intuitively (adds 1 wei, not 1 token)
- **Implementation**: Check node type in evaluator, lift if scalar literal

### 5. Ceil Division Formula
- **Decision**: `(a + b - 1) / b` for ceil when remainder exists
- **Reason**: Matches gas-optimized Solidity pattern
- **Implementation**: Check remainder, apply formula in ceil mode

### 6. Sidebar View (Not Panel)
- **Decision**: Use `WebviewViewProvider` for sidebar, not `createWebviewPanel`
- **Reason**: User wanted it to stay in sidebar like Chat panel
- **Implementation**: Register as view in Activity Bar

---

## 📊 Current Status

### Working Features ✅
- [x] Core engine with 148 passing tests
- [x] Web UI at localhost:5173 (dev server)
- [x] Extension working in Extension Development Host (F5)
- [x] Sidebar integration in VS Code
- [x] All 38 guidelines implemented
- [x] Theme toggle (dark/light)
- [x] Floor/Ceil rounding modes
- [x] Loss calculation and display
- [x] Auto-evaluation
- [x] Variable auto-detection
- [x] Build optimization (bundle splitting)

### Pending ⏳
- [ ] Marketplace approval (waiting for manual review)
  - **Issue**: Automated review flagging 180 KB React bundle as "suspicious"
  - **Action**: Contacted marketplace support via email
  - **Status**: Awaiting response (1-2 business days expected)

### Distribution Options ✅
**VS Code Extension:**
- [x] Can package locally: `npm run package`
- [x] Can install via: `code --install-extension solcalc-0.1.0.vsix`
- [x] Ready for VS Code Marketplace publishing
- [ ] GitHub Releases setup (optional, if marketplace delays)

**Web Application:**
- [x] Standalone webapp with centered 800px layout
- [x] Production build ready: `npm run build`
- [x] Can deploy to: Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.
- [x] Full offline functionality (no backend required)

---

## 🐛 Known Issues

### 1. Marketplace Automated Review
- **Issue**: "Your extension has suspicious content" error
- **Cause**: 180 KB React bundle + new publisher account
- **Fix Attempted**:
  - Added all metadata (homepage, bugs, license, qna)
  - Added capabilities declaration
  - Optimized build (bundle splitting)
  - Enhanced README with architecture explanation
  - Added CHANGELOG
- **Current Status**: Waiting for manual review from marketplace support
- **Email Sent**: December 15, 2024

### 2. None - Extension Works Perfectly in Dev Mode

---

## 🚀 How to Test Locally

### 1. Run Web UI
```bash
cd ui
npm run dev
# Opens at http://localhost:5173
```

### 2. Test Extension
```bash
cd extension
code .
# Press F5 to launch Extension Development Host
# Click calculator icon in Activity Bar
```

### 3. Run Tests
```bash
cd core
npm test
# All 148 tests should pass
```

### 4. Build Everything
```bash
# From project root
npm run build
```

### 5. Package Extension
```bash
cd extension
npm run package
# Creates solcalc-0.1.0.vsix
```

### 6. Install Locally
```bash
code --install-extension solcalc-0.1.0.vsix
```

---

## 📝 Next Steps

### Immediate Deployment Options
**VS Code Extension:**
1. ✅ Wait for marketplace support response
2. Publish to VS Code Marketplace once approved
3. Create GitHub Release with .vsix file (alternative distribution)
4. Update main README with installation instructions

**Web Application:**
1. Build production version: `cd ui && npm run build`
2. Deploy to hosting platform (Vercel, Netlify, GitHub Pages, etc.)
3. Share web link for instant access (no installation required)
4. Optional: Set up custom domain

See **DEPLOYMENT.md** for complete step-by-step guides.

### Future Enhancements (Optional)
- [ ] Add keyboard shortcuts
- [ ] Add context menu integration ("Calculate with SolCalc")
- [ ] Add command to paste expression from selection
- [ ] Add command to copy result to clipboard
- [ ] Add more example expressions in guidelines
- [ ] Add search/filter for guidelines
- [ ] Add favorite/bookmark guidelines
- [ ] Add calculation history
- [ ] Add export results to file
- [ ] Add support for custom scale constants

### Marketing (Post-Launch)
- [ ] Tweet about launch
- [ ] Post on Reddit (r/ethdev, r/solidity)
- [ ] Write blog post explaining the tool
- [ ] Create demo video/GIF
- [ ] Add to awesome-solidity lists

---

## 🔧 Build Commands Reference

### Core
```bash
cd core
npm install
npm run build      # Build to dist/
npm test           # Run 79 tests
```

### UI
```bash
cd ui
npm install
npm run dev                 # Dev server (localhost:5173)
npm run build              # Build to dist/
npm run build:extension    # Build to ../extension/webview/
```

### Extension
```bash
cd extension
npm install
npm run compile    # Compile TS to dist/
npm run watch      # Watch mode
npm run package    # Create .vsix file
```

### Root
```bash
npm run install:all        # Install all deps
npm run build:core         # Build core only
npm run build:ui          # Build UI for extension
npm run build:extension   # Compile extension
npm run build             # Build everything
```

---

## 📞 Support & Links

- **Repository**: https://github.com/32bits-toby/sol-calc
- **Issues**: https://github.com/32bits-toby/sol-calc/issues
- **Publisher**: keepitfortoby
- **Marketplace**: (pending approval)

---

## 💡 Resume Development

When resuming development, ask Claude to:
```
Read DEVELOPMENT_PROGRESS.md to understand the current state of the SolCalc project.
```

This file contains:
- Complete feature list
- Architecture overview
- Current status and blockers
- Build commands
- Next steps

---

## 🎯 Success Metrics

- [x] Core engine accuracy: 100% (148/148 tests passing)
- [x] UI completeness: 100% (all features implemented)
- [x] Extension functionality: 100% (works in dev mode)
- [x] Web application: Ready for deployment
- [ ] Marketplace published: Pending (waiting for approval)
- [ ] Web app deployed: Ready (choose hosting platform)
- [ ] Users: 0 (pre-launch)

---

## 📖 Deployment Documentation

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete guides on:
- Installing the VS Code extension locally
- Publishing to VS Code Marketplace
- Building and deploying the web application

---

**Project Status**: Ready to Launch 🚀
**Distribution**: Dual-platform (VS Code Extension + Web App)
**VS Code Extension**: Pending marketplace approval (alternative: local installation available)
**Web Application**: Ready for deployment to any static hosting platform
