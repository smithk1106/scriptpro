// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('================ScriptPro=================');
	console.log(context.extensionUri.fsPath);
	console.log(context.extensionPath);
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let formatDisposable = vscode.commands.registerCommand('scriptpro.format', () => {
		const editor = vscode.window.activeTextEditor;
		if(editor != null) {
			// Get selected text
			let selectedText = '';
			let curSelection:vscode.Selection;

			if(!editor.selection.isEmpty) {
				selectedText = editor.document.getText(editor.selection);
				curSelection = editor.selection;
			} else {
				selectedText = editor.document.getText();
				curSelection = editor.selection;
			}
			//[DEBUG]
			vscode.window.showInformationMessage(selectedText);
			let lastLine = editor.document.lineAt(editor.document.lineCount - 1);
			editor.edit((builder:vscode.TextEditorEdit) => {
				builder.replace(lastLine.range.end, '');
			});

			// Format selected text
			
			
		}
		
		// Display a message box to the user
		// vscode.window.showInformationMessage('I am creating "scriptpro.format" now, please wait!');
	});
	context.subscriptions.push(formatDisposable);

	let runDisposable = vscode.commands.registerCommand('scriptpro.run', () => {
		const editor = vscode.window.activeTextEditor;
		if(editor != null) {
			let scriptPath = editor.document.fileName;
			if(editor.document.isDirty) {
				vscode.window.showErrorMessage('Please save the current script before run it!');
				return;
			} else {
				vscode.window.showInformationMessage('Please press "Ctrl+T" to stop the script.');
			}

			// [DEBUG]
			const path = require("path");
			scriptPath = path.dirname(scriptPath);

			// Run script
			const process = require('child_process')
			process.exec('ls -lash ' + scriptPath, (err:object, stdout:string, stderr:string) => {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
				if (err) {
					console.log('error: ' + err);
				}

				//[DEBUG]
				let txt = scriptPath + '\n' + stdout;
				let lastLine = editor.document.lineAt(editor.document.lineCount - 1);
				editor.edit((builder:vscode.TextEditorEdit) => {
					builder.replace(lastLine.range.end, txt);
				});
			});
		}

		// Display a message box to the user
		//vscode.window.showInformationMessage('I am creating "scriptpro.run" now, please wait!');
	});
	context.subscriptions.push(runDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
