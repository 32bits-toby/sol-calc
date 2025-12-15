"use strict";
/**
 * SolCalc Webview Provider
 *
 * Manages the webview in the sidebar
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolCalcWebviewProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class SolCalcWebviewProvider {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview')],
        };
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
    }
    getHtmlContent(webview) {
        // Path to the built UI files
        const webviewPath = vscode.Uri.joinPath(this.extensionUri, 'webview');
        const indexPath = path.join(webviewPath.fsPath, 'index.html');
        // Read the built index.html
        let html = fs.readFileSync(indexPath, 'utf8');
        // Convert file paths to webview URIs
        html = html.replace(/(href|src)="\/assets\//g, (match, attr) => {
            const assetsUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewPath, 'assets'));
            return `${attr}="${assetsUri}/`;
        });
        // Add CSP meta tag
        const cspSource = webview.cspSource;
        html = html.replace('<head>', `<head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; img-src ${cspSource} data:;">`);
        return html;
    }
}
exports.SolCalcWebviewProvider = SolCalcWebviewProvider;
SolCalcWebviewProvider.viewType = 'solcalc.calculatorView';
//# sourceMappingURL=webviewProvider.js.map