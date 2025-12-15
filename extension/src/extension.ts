/**
 * SolCalc VS Code Extension Entry Point
 */

import * as vscode from 'vscode';
import { SolCalcWebviewProvider } from './webviewProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('SolCalc extension is now active');

  const provider = new SolCalcWebviewProvider(context.extensionUri);

  // Register the webview view provider for the sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SolCalcWebviewProvider.viewType,
      provider
    )
  );
}

export function deactivate() {
  console.log('SolCalc extension is now deactivated');
}
