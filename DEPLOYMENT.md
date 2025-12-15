# SolCalc - Deployment Guide

Complete step-by-step instructions for deploying SolCalc as a VS Code extension and web application.

**Last Updated**: December 15, 2024

---

## Table of Contents

1. [Installing VS Code Extension Locally](#1-installing-vs-code-extension-locally)
2. [Publishing to VS Code Marketplace](#2-publishing-to-vs-code-marketplace)
3. [Building and Deploying Web Application](#3-building-and-deploying-web-application)

---

## 1. Installing VS Code Extension Locally

Use this method to install and test the extension locally before marketplace approval, or to distribute the extension manually.

### Prerequisites

- Node.js (v18 or higher)
- VS Code installed
- `vsce` package (VS Code Extension Manager CLI)

### Step 1: Install Dependencies

```bash
# From project root
npm run install:all
```

This installs dependencies for:
- `/core` - BigInt calculator engine
- `/ui` - React UI components
- `/extension` - VS Code extension

### Step 2: Build All Components

```bash
# From project root
npm run build
```

This command runs:
1. `build:core` - Compiles TypeScript engine to ES modules
2. `build:ui` - Builds React UI and copies to `/extension/webview/`
3. `build:extension` - Compiles extension TypeScript code

### Step 3: Package the Extension

```bash
# Navigate to extension directory
cd extension

# Install vsce if not already installed
npm install -g @vscode/vsce

# Package the extension
npm run package
```

This creates `solcalc-0.1.0.vsix` in the `/extension` directory.

**What gets packaged:**
- Compiled extension code (`/dist`)
- Built React UI (`/webview`)
- Extension manifest (`package.json`)
- Icons and resources
- README, LICENSE, CHANGELOG

**Size**: ~182 KB (React vendor bundle + app code)

### Step 4: Install the Extension

**Method 1: Command Line (Recommended)**

```bash
code --install-extension solcalc-0.1.0.vsix
```

**Method 2: VS Code UI**

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu (top right)
4. Select "Install from VSIX..."
5. Navigate to `solcalc-0.1.0.vsix` and select it

### Step 5: Verify Installation

1. Look for the calculator icon in the Activity Bar (left sidebar)
2. Click the icon to open SolCalc in the sidebar
3. Test basic calculation: `1e18 + 1e18`

### Uninstalling

```bash
code --uninstall-extension keepitfortoby.solcalc
```

Or via VS Code Extensions view → Right-click "SolCalc" → Uninstall

---

## 2. Publishing to VS Code Marketplace

Complete guide for publishing SolCalc to the official VS Code Marketplace.

### Prerequisites

- Microsoft account
- Azure DevOps organization
- Personal Access Token (PAT) from Azure DevOps
- `vsce` CLI tool installed globally

### Step 1: Create Microsoft Account and Azure DevOps Organization

**If you already have these, skip to Step 2.**

1. **Create Microsoft Account**
   - Go to https://account.microsoft.com
   - Sign up or sign in

2. **Create Azure DevOps Organization**
   - Go to https://dev.azure.com
   - Click "Create new organization"
   - Follow the prompts (organization name doesn't matter for publishing)

### Step 2: Generate Personal Access Token (PAT)

1. Go to https://dev.azure.com
2. Click on your profile icon (top right) → "Personal access tokens"
3. Click "+ New Token"
4. Configure the token:
   - **Name**: `vsce-publish-token`
   - **Organization**: Select "All accessible organizations"
   - **Expiration**: Custom defined (1 year recommended)
   - **Scopes**: Click "Show all scopes"
   - **Select**: Check "Marketplace" → "Manage" (full scope)
5. Click "Create"
6. **IMPORTANT**: Copy the token immediately - you won't see it again
7. Store it securely (password manager recommended)

### Step 3: Create VS Code Publisher Account

**First-time publishers only:**

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click "Create publisher"
4. Fill in details:
   - **ID**: `keepitfortoby` (must match `package.json`)
   - **Name**: Your display name
   - **Email**: Your email
5. Click "Create"

**Verify publisher ID in package.json:**
```json
{
  "publisher": "keepitfortoby"
}
```

### Step 4: Login with vsce

```bash
# Login to publisher account
vsce login keepitfortoby
```

When prompted, paste your Personal Access Token (PAT).

**Store PAT for future use:**
```bash
# Alternative: Set as environment variable
export VSCE_PAT=your-personal-access-token

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export VSCE_PAT=your-pat-here' >> ~/.zshrc
```

### Step 5: Pre-Publishing Checklist

Before publishing, verify all metadata is complete:

**Required Files:**
- [x] `README.md` - Comprehensive usage guide
- [x] `CHANGELOG.md` - Version history
- [x] `LICENSE` - MIT license
- [x] `icon.png` - 128x128 marketplace icon

**package.json Metadata:**
```json
{
  "name": "solcalc",
  "displayName": "SolCalc",
  "description": "Mixed-decimal calculator for Solidity audits",
  "version": "0.1.0",
  "publisher": "keepitfortoby",
  "repository": "https://github.com/32bits-toby/sol-calc",
  "homepage": "https://github.com/32bits-toby/sol-calc#readme",
  "bugs": "https://github.com/32bits-toby/sol-calc/issues",
  "license": "MIT",
  "qna": "https://github.com/32bits-toby/sol-calc/discussions"
}
```

**Build the extension:**
```bash
cd extension
npm run package
```

### Step 6: Publish to Marketplace

**Test packaging first:**
```bash
vsce package
```

**Publish:**
```bash
vsce publish
```

**Or publish with automatic version bump:**
```bash
vsce publish patch  # 0.1.0 → 0.1.1
vsce publish minor  # 0.1.0 → 0.2.0
vsce publish major  # 0.1.0 → 1.0.0
```

### Step 7: Monitor Publishing Status

1. **Automated Review** (~5 minutes)
   - Basic security scan
   - File size validation
   - Metadata verification

2. **Manual Review** (if flagged, 1-3 business days)
   - Human review of flagged content
   - Common reasons: Large bundles, new publishers

3. **Published** ✅
   - Extension appears in marketplace
   - Users can install via search

**Check status:**
- Go to https://marketplace.visualstudio.com/manage/publishers/keepitfortoby
- View published extensions and their status

### Step 8: Verify Publication

**Search Marketplace:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "SolCalc"
4. Verify it appears with correct metadata

**Direct Link:**
```
https://marketplace.visualstudio.com/items?itemName=keepitfortoby.solcalc
```

### Common Publishing Issues

**Issue 1: "Suspicious Content" Error**

**Cause**: Large React bundle (~180 KB) flagged by automated review

**Solutions**:
1. **Add detailed README** explaining the bundle size
2. **Contact support**: marketplace@microsoft.com with:
   - Extension name and publisher ID
   - Explanation of React dependency
   - Link to public repository
3. **Wait for manual review** (1-3 business days)

**Issue 2: "Missing Metadata" Error**

**Fix**: Ensure all fields in `package.json` are complete:
```json
{
  "repository": { "type": "git", "url": "..." },
  "homepage": "...",
  "bugs": { "url": "..." },
  "license": "MIT",
  "qna": "marketplace"
}
```

**Issue 3: "Invalid Publisher" Error**

**Fix**: Login again with correct publisher ID:
```bash
vsce login keepitfortoby
```

### Publishing Updates

**After making changes:**

1. Update `CHANGELOG.md` with changes
2. Bump version in `package.json`:
   ```json
   {
     "version": "0.1.1"
   }
   ```
3. Build and publish:
   ```bash
   cd extension
   npm run package
   vsce publish
   ```

**Or use automatic versioning:**
```bash
vsce publish patch  # Auto-bumps version
```

---

## 3. Building and Deploying Web Application

Deploy SolCalc as a standalone web application accessible via browser.

### Overview

SolCalc's React UI can be deployed to any static hosting platform:
- **Vercel** (Recommended - easiest)
- **Netlify**
- **GitHub Pages**
- **Cloudflare Pages**
- **Custom server** (Nginx, Apache, etc.)

### Step 1: Build Production Version

```bash
# Navigate to UI directory
cd ui

# Install dependencies (if not already done)
npm install

# Build for production
npm run build
```

**Output**: Optimized static files in `ui/dist/`

**Build includes:**
- Minified JavaScript bundles
- Optimized CSS
- HTML entry point
- Source maps (for debugging)

**Build size**: ~182 KB total
- React vendor bundle: ~139.5 KB
- App code: ~43 KB

### Step 2: Test Production Build Locally

```bash
# Install a simple HTTP server
npm install -g serve

# Serve the built files
cd ui/dist
serve -s .
```

Open http://localhost:3000 and verify:
- Calculator loads correctly
- Theme toggle works
- Calculations are accurate
- Guidelines modal opens

### Option A: Deploy to Vercel (Recommended)

**Why Vercel**: Zero configuration, automatic HTTPS, global CDN, free tier.

**Prerequisites:**
- Vercel account (sign up at https://vercel.com)
- Vercel CLI (optional but recommended)

**Method 1: Vercel CLI (Fastest)**

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to UI directory
cd ui

# Deploy
vercel --prod
```

**Interactive prompts:**
1. "Set up and deploy?" → Yes
2. "Which scope?" → Your account
3. "Link to existing project?" → No
4. "Project name?" → solcalc (or your choice)
5. "Directory?" → ./ (press Enter)
6. "Want to modify settings?" → No

**Done!** Vercel provides a URL like: `https://solcalc.vercel.app`

**Method 2: Vercel Dashboard (No CLI)**

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your Git repository (GitHub, GitLab, Bitbucket)
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: ui
   - **Build Command**: `npm run build`
   - **Output Directory**: dist
5. Click "Deploy"

**Custom Domain (Optional):**
1. Go to project settings → "Domains"
2. Add your domain
3. Configure DNS (Vercel provides instructions)

### Option B: Deploy to Netlify

**Prerequisites:**
- Netlify account (https://netlify.com)

**Method 1: Drag & Drop**

1. Build the project:
   ```bash
   cd ui
   npm run build
   ```
2. Go to https://app.netlify.com/drop
3. Drag the `ui/dist` folder onto the page
4. Done! Netlify provides a URL

**Method 2: Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Navigate to UI directory
cd ui

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

**Method 3: Git Integration**

1. Push code to GitHub
2. Go to https://app.netlify.com
3. Click "Add new site" → "Import an existing project"
4. Connect your repository
5. Configure:
   - **Base directory**: ui
   - **Build command**: `npm run build`
   - **Publish directory**: ui/dist
6. Click "Deploy"

### Option C: Deploy to GitHub Pages

**Prerequisites:**
- GitHub repository
- GitHub Pages enabled

**Step 1: Update Vite Config**

Create/edit `ui/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/sol-calc/', // Replace with your repo name
});
```

**Step 2: Build**

```bash
cd ui
npm run build
```

**Step 3: Deploy**

**Option 1: Manual (via gh-pages branch)**

```bash
# Install gh-pages utility
npm install -g gh-pages

# Deploy dist folder to gh-pages branch
gh-pages -d dist
```

**Option 2: GitHub Actions (Automated)**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd ui
          npm install

      - name: Build
        run: |
          cd ui
          npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./ui/dist
```

**Step 4: Enable GitHub Pages**

1. Go to repository → Settings → Pages
2. Source: Deploy from a branch
3. Branch: gh-pages / root
4. Save

**Access**: https://yourusername.github.io/sol-calc/

### Option D: Deploy to Cloudflare Pages

**Method 1: Cloudflare Dashboard**

1. Go to https://dash.cloudflare.com
2. Pages → "Create a project"
3. Connect Git repository
4. Configure:
   - **Framework**: Vite
   - **Build command**: `cd ui && npm install && npm run build`
   - **Build output**: `ui/dist`
5. Deploy

**Method 2: Wrangler CLI**

```bash
# Install Wrangler
npm install -g wrangler

# Build
cd ui
npm run build

# Deploy
wrangler pages deploy dist --project-name=solcalc
```

### Option E: Deploy to Custom Server

**Requirements:**
- Web server (Nginx, Apache, Caddy, etc.)
- SSH access

**Step 1: Build**

```bash
cd ui
npm run build
```

**Step 2: Upload Files**

```bash
# Using SCP
scp -r dist/* user@yourserver:/var/www/solcalc/

# Or using rsync
rsync -avz dist/ user@yourserver:/var/www/solcalc/
```

**Step 3: Configure Web Server**

**Nginx example:**

```nginx
server {
    listen 80;
    server_name solcalc.yourdomain.com;
    root /var/www/solcalc;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

**Apache example (.htaccess):**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Step 4: Setup HTTPS (Recommended)**

```bash
# Using Certbot (Let's Encrypt)
sudo certbot --nginx -d solcalc.yourdomain.com
```

### Performance Optimization

**Already optimized in build:**
- [x] React production build (minified)
- [x] Bundle splitting (vendor + app)
- [x] Tree-shaking (unused code removed)
- [x] Terser minification
- [x] CSS minification

**Additional optimizations:**

**Enable Compression** (if not automatic):

Most platforms enable Gzip/Brotli automatically. If not:

**Nginx:**
```nginx
gzip on;
gzip_types text/css application/javascript;
gzip_min_length 1000;
```

**Add Cache Headers:**

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Environment Variables (If Needed)

SolCalc doesn't require environment variables, but if you add API integrations:

**Create `.env.production`:**
```env
VITE_API_URL=https://api.example.com
```

**Update `vite.config.ts`:**
```typescript
export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
  },
});
```

**Deploy with env vars:**
- **Vercel**: Add in dashboard → Settings → Environment Variables
- **Netlify**: Add in dashboard → Site settings → Environment variables
- **GitHub Pages**: Use GitHub Secrets + Actions

### Monitoring and Analytics (Optional)

**Add Google Analytics:**

Edit `ui/index.html`:

```html
<head>
  <!-- Existing head content -->

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
```

---

## Post-Deployment Checklist

### VS Code Extension

- [ ] Extension packaged successfully
- [ ] Local installation tested
- [ ] All features working in sidebar view
- [ ] Published to marketplace (or pending approval)
- [ ] README updated with installation link
- [ ] GitHub Release created with .vsix file (optional)

### Web Application

- [ ] Production build created
- [ ] Local preview tested (all features working)
- [ ] Deployed to hosting platform
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)
- [ ] Performance tested (Lighthouse score)
- [ ] Mobile responsive verified
- [ ] Share link with users

---

## Troubleshooting

### Extension Won't Install

**Error**: "Extension is not compatible"

**Fix**: Check VS Code version. SolCalc requires VS Code 1.85.0+

```bash
code --version
```

### Web App Shows Blank Page

**Cause**: Incorrect base path in production

**Fix**: Verify `vite.config.ts` base path matches deployment URL

**GitHub Pages**: `base: '/sol-calc/'`
**Custom domain**: `base: '/'`

### Build Errors

**Error**: "Module not found"

**Fix**: Clean install dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Large Bundle Size Warning

**Normal**: React vendor bundle is ~140 KB (gzipped: ~45 KB)

**Acceptable**: Modern web apps with React typically range 100-500 KB

**Already optimized**: Code splitting, tree-shaking, minification applied

---

## Support

- **Issues**: https://github.com/32bits-toby/sol-calc/issues
- **Discussions**: https://github.com/32bits-toby/sol-calc/discussions
- **Email**: marketplace@microsoft.com (for marketplace issues)

---

**Last Updated**: December 15, 2024
**Version**: 0.1.0
