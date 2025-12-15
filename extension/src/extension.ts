/**
 * SolCalc VS Code Extension Entry Point
 */

import * as vscode from 'vscode';
import { SolCalcWebviewProvider } from './webviewProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('SolCalc extension is now active');

  const provider = new SolCalcWebviewProvider(context.extensionUri);

  // Register the command to open SolCalc
  const openCommand = vscode.commands.registerCommand('solcalc.open', () => {
    provider.show();
  });

  context.subscriptions.push(openCommand);
}

export function deactivate() {
  console.log('SolCalc extension is now deactivated');
}
