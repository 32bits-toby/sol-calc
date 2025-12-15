/**
 * SolCalc Webview Provider
 *
 * Manages the webview panel that hosts the React UI
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class SolCalcWebviewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  public show() {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (SolCalcWebviewProvider.currentPanel) {
      SolCalcWebviewProvider.currentPanel.reveal(column);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'solcalc',
      'SolCalc',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, 'webview'),
        ],
      }
    );

    SolCalcWebviewProvider.currentPanel = panel;

    // Set the HTML content
    panel.webview.html = this.getHtmlContent(panel.webview);

    // Reset when the panel is closed
    panel.onDidDispose(() => {
      SolCalcWebviewProvider.currentPanel = undefined;
    });
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
