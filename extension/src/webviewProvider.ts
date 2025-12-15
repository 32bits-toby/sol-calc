/**
 * SolCalc Webview Provider
 *
 * Manages the webview in the sidebar
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class SolCalcWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'solcalc.calculatorView';
  private _view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'webview')],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);
  }

  private getHtmlContent(webview: vscode.Webview): string {
    // Path to the built UI files
    const webviewPath = vscode.Uri.joinPath(this.extensionUri, 'webview');
    const indexPath = path.join(webviewPath.fsPath, 'index.html');

    // Read the built index.html
    let html = fs.readFileSync(indexPath, 'utf8');

    // Convert file paths to webview URIs
    html = html.replace(
      /(href|src)="\/assets\//g,
      (match, attr) => {
        const assetsUri = webview.asWebviewUri(
          vscode.Uri.joinPath(webviewPath, 'assets')
        );
        return `${attr}="${assetsUri}/`;
      }
    );

    // Add CSP meta tag
    const cspSource = webview.cspSource;
    html = html.replace(
      '<head>',
      `<head>
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; img-src ${cspSource} data:;">`
    );

    return html;
  }
}
