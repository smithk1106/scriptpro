// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import util = require('util');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('================ScriptPro=================');
	console.log('[D]ExtensionPath: ' + context.extensionPath);
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let formatDisposable = vscode.commands.registerCommand('scriptpro.format', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor != null) {
			// Get selected text
			let selectedText = '';
			let curRange: vscode.Range;

			if (!editor.selection.isEmpty) {
				selectedText = editor.document.getText(editor.selection);
				curRange = new vscode.Range(editor.selection.start, editor.selection.end);
			} else {
				selectedText = editor.document.getText();
				curRange = new vscode.Range(
					editor.document.lineAt(0).range.start,
					editor.document.lineAt(editor.document.lineCount - 1).range.end
				);
			}
			//[DEBUG]
			//vscode.window.showInformationMessage(selectedText);

			// Format selected text
			selectedText = selectedText.trim();
			if (selectedText.length > 0) {
				let formatedScript = formatScript(selectedText);
				editor.edit((builder: vscode.TextEditorEdit) => {
					builder.replace(curRange, formatedScript);
				});
			}
		}

		// Display a message box to the user
		// vscode.window.showInformationMessage('I am creating "scriptpro.format" now, please wait!');
	});
	context.subscriptions.push(formatDisposable);

	let runDisposable = vscode.commands.registerCommand('scriptpro.run', () => {
		const path = require("path");
		const editor = vscode.window.activeTextEditor;
		if (editor != null) {
			let scriptPath = editor.document.fileName;
			if (editor.document.isDirty) {
				vscode.window.showErrorMessage('Please save the script before run it!');
				return;
			}

			// Run script
			const baseDir = context.extensionPath;
			const localConfig = vscode.workspace.getConfiguration('scriptpro');

			//DEBUG
			console.log('[D]scriptpro.playerPath: ' + localConfig.get<string>('playerPath'));
			console.log('[D]scriptpro.silent: ' + localConfig.get<boolean>('silent'));

			const process = require('child_process')
			let payerPath = path.resolve(baseDir, localConfig.get<string>('playerPath', 'bin/ScriptPlayer.exe'));
			let silentFlag = (localConfig.get<boolean>('silent', true) ? '/silent' : '');
			let cmd: string = util.format('%s "%s" %s', payerPath, scriptPath, silentFlag);

			cmd = cmd.trim()
			vscode.window.showInformationMessage('Start ' + scriptPath);
			vscode.window.showInformationMessage('Press "Ctrl+T" to stop the script.');
			process.exec(cmd, (err: object, stdout: string, stderr: string) => {
				console.log('[D]stdout: ' + stdout);
				console.log('[D]stderr: ' + stderr);
				if (err) {
					console.log(err);
					vscode.window.showErrorMessage('Failed to start script player!');
				} else {
					if(stderr && stderr.trim().length > 0) {
						let errorMsg = stderr;
						let pos = stderr.indexOf('*');
						if(pos >= 0) {
							errorMsg = stderr.substring(pos + 1);
						}
						vscode.window.showErrorMessage(errorMsg);

						const match = errorMsg.match(/(?:variable '([^']*)'){0,1} in line (\d+)/);
						if(match) {
							// Get line number
							let lineNum:number = parseInt(match[2]) - 1;
							let line:vscode.TextLine = editor.document.lineAt(lineNum);
							// Try get variable anme
							let varName = (match[1] ? match[1] : '');
							let varPos:number = -1;
							if(varName.length > 0) {
								varPos = line.text.indexOf(varName);
							}
							// Create selection
							if(varPos >= 0) {
								// Select error variable
								editor.selection = new vscode.Selection(lineNum, varPos, lineNum, varPos + varName.length);
							} else {
								// Select error line
								editor.selection = new vscode.Selection(line.range.start, line.range.end);
							}
							editor.revealRange(editor.selection);
						}
					}
					vscode.window.showInformationMessage('Stoped ' + scriptPath);
				}
			});
		}

		// Display a message box to the user
		//vscode.window.showInformationMessage('I am creating "scriptpro.run" now, please wait!');
	});
	context.subscriptions.push(runDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function matchAll(pattern:RegExp, text:string) {
	let results:Array<RegExpExecArray> = [];
	let curMatch;

	while(curMatch = pattern.exec(text)) {
		results.push(curMatch);
	}

	return results;
}

function formatCommonParams(pattern: RegExp, paramPart: string) {
	let params: string = '';
	let curMatch;

	while (curMatch = pattern.exec(paramPart)) {
		if(curMatch[1] && curMatch[1].length > 1) {
			params += ' ' + curMatch[1].charAt(0).toUpperCase() + curMatch[1].substring(1).toLowerCase();
		} else {
			params += ' ' + curMatch[0];
		}
	}

	return params;
}

function formatScript(text: string): string {
	let formatedText: string = '';
	let lines = text.split('\n');
	let curIndent: string = '';

	for (const i in lines) {
		let curLine: string = lines[i].trim().replace('\t', ' ');
		let pos: number;
		let partAction: string, partParam: string;
		let newLine: string = '';

		if (curLine.length > 0) {
			if (curLine.startsWith('@')) {
				// Format variables
				const match = curLine.match(/(@[a-zA-Z_]+[a-zA-Z0-9_]*)\s*(\:\=|\+\=|\-\=|\*\=|\%\=)\s*(.+)/);
				if (match) {
					newLine = util.format('%s%s %s %s', curIndent, match[1], match[2], match[3].trim());
				}
			} else if (curLine.startsWith(':')) {
				// Format labels
				newLine = curIndent + curLine;
			} else {
				// Split action part and parameter part
				pos = curLine.indexOf(' ');
				if (pos > 0) {
					partAction = curLine.substring(0, pos);
					partParam = curLine.substring(pos).trim();
				} else {
					partAction = curLine;
					partParam = '';
				}
				
				// Check and format actions
				partAction = partAction.toLowerCase();
				if (partAction == 'if') {
					const match = partParam.match(/(.+)\s+then$/i);
					if (match) {
						newLine = util.format('%sIf %s Then', curIndent, match[1].trim());
					}
					curIndent += '\t';
				} else if (partAction == 'elseif') {
					const match = partParam.match(/(.+)\s+then$/i);
					if (curIndent.length > 0) curIndent = curIndent.substring(1);
					if (match) {
						newLine = util.format('%sElseIf %s Then', curIndent, match[1].trim());
					} else {
						newLine = util.format('%sElseIf %s', curIndent, partParam);
					}
					curIndent += '\t';
				} else if (partAction == 'else') {
					if (curIndent.length > 0) curIndent = curIndent.substring(1);
					newLine = curIndent + 'Else';
					curIndent += '\t';
				} else if (partAction == 'endif') {
					if (curIndent.length > 0) curIndent = curIndent.substring(1);
					newLine = curIndent + 'EndIf';
				} else if (partAction == 'goto') {
					const match = partParam.match(/\:{0,1}([a-zA-Z_]+[a-zA-Z0-9_]*)/i);
					if (match) {
						newLine = util.format('%sGoto :%s', curIndent, match[1]);
					} else {
						newLine = util.format('%sGoto %s', curIndent, partParam);
					}
				} else if (partAction == 'exit') {
					newLine = curIndent + 'Exit';
				} else if (partAction == 'delay') {
					newLine = util.format('%sDelay %s', curIndent, partParam);
				} else if (partAction == 'defdelay') {
					newLine = util.format('%sDefDelay %s', curIndent, partParam);
				} else if (partAction == 'use') {
					newLine = util.format('%sUse %s', curIndent, partParam);
				} else if (partAction == 'unset') {
					newLine = curIndent + 'Unset'
						+ formatCommonParams(/@[a-zA-Z_]+[a-zA-Z0-9_]*/g, partParam);
				} else if (partAction == 'setreturn') {
					newLine = curIndent + 'SetReturn'
						+ formatCommonParams(/@[a-zA-Z_]+[a-zA-Z0-9_]*/g, partParam);
				} else if (partAction == 'random') {
					newLine = curIndent + 'Random'
						+ formatCommonParams(/@[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9\.]+/g, partParam);
				} else if (partAction == 'call') {
					newLine = curIndent + 'Call'
						+ formatCommonParams(/"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9\.]+/g, partParam);
				} else if (partAction == 'include') {
					newLine = curIndent + 'Include'
						+ formatCommonParams(/"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*/g, partParam);
				} else if (partAction == 'onerror') {
					const match = partParam.match(/(resume|goto|exit)\s*(.*)/i);
					if (match) {
						if (match[1].toLowerCase() == 'resume') {
							newLine = curIndent + 'OnError Resume Next';
						} else if (match[1].toLowerCase() == 'resume') {
							newLine = util.format('%sOnError Goto %s', curIndent, match[2].trim());
						} else {
							newLine = curIndent + 'OnError Exit';
						}
					}
				} else if (partAction == 'invoke') {
					newLine = curIndent + 'Invoke'
						+ formatCommonParams(/"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9\.]+/g, partParam);
				} else if (partAction == 'msgbox') {
					newLine = curIndent + 'MsgBox'
						+ formatCommonParams(/"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9\.]+/g, partParam);
				} else if (partAction == 'run') {
					newLine = curIndent + 'Run'
						+ formatCommonParams(/"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9\.]+/g, partParam);
				} else if (partAction == 'runandwait') {
					newLine = curIndent + 'RunAndWait'
						+ formatCommonParams(/"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9\.]+/g, partParam);
				} else if (partAction == 'monitor') {
					if (partParam.toLowerCase() == 'on') {
						newLine = curIndent + 'Monitor On';
					} else {
						newLine = curIndent + 'Monitor Off';
					}
				} else if (partAction == 'messagemode') {
					if (partParam.toLowerCase() == 'on') {
						newLine = curIndent + 'MessageMode On';
					} else {
						newLine = curIndent + 'MessageMode Off';
					}
				} else if (partAction == 'checkpixel') {
					newLine = curIndent + 'CheckPixel'
						+ formatCommonParams(/#[0-9a-f]+|@{0,1}[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}[0-9]+/g, partParam);
				} else if (partAction == 'findpixel') {
					newLine = curIndent + 'FindPixel'
						+ formatCommonParams(/#[0-9a-f]+|@{0,1}[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}[0-9]+/g, partParam);
				} else if (partAction == 'findmodel') {
					newLine = curIndent + 'FindModel'
						+ formatCommonParams(/"[^"]*"|@{0,1}[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}[0-9]+/g, partParam);
				} else if (partAction == 'capture') {
					newLine = curIndent + 'Capture'
						+ formatCommonParams(/"[^"]*"|@{0,1}[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}[0-9]+/g, partParam);
				} else if (partAction == 'key') {
					newLine = curIndent + 'Key'
						+ formatCommonParams(/(down|up|press)|[a-zA-Z0-9]+/g, partParam);
				} else if (partAction == 'sendkeys') {
					newLine = util.format('%sSendKeys %s', curIndent, partParam);
				} else if (partAction == 'settext') {
					newLine = util.format('%sSetText %s', curIndent, partParam);
				} else if (partAction == 'gettext') {
					newLine = util.format('%sGetText %s', curIndent, partParam);
				} else if (partAction == 'origin') {
					const matches = matchAll(/(from|point|null|LT|LB|RT|RB|TL|BL|TR|BR)|"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}[0-9]+/ig, partParam);
					
					newLine = curIndent + 'Origin';
					if (matches.length > 1) {
						if(matches[0][1] && matches[0][1].toLowerCase() == 'from'){
							newLine += ' From';
							if(matches[1][1] && matches[1][1].toLowerCase() == 'point'){
								newLine += ' Point';
								pos = 2;
							} else {
								pos = 1;
							}
						} else {
							pos = 0;
						}

						for(; pos < matches.length; pos++){
							if(matches[pos][1] && matches[pos][1].length > 0) {
								if(matches[pos][1].toLowerCase() == 'null') {
									newLine += ' Null';
								} else {
									newLine += ' ' + matches[pos][1].toUpperCase();
								}
							} else {
								newLine += ' ' + matches[pos][0];
							}
						}
					} else {
						newLine += formatCommonParams(/"[^"]*"|@{0,1}[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9]+/g, partParam);
					}
				} else if (partAction == 'mouse') {
					//const matches = matchAll(/(left|right|middle|move|down|up|click|doubleclick|at|offset)|@[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}\d+/g, partParam);
					
					newLine = curIndent + 'Mouse';
					// if (matches.length > 0) {
					// 	console.log(matches);	//DEBUG
					// 	for(pos = 0; pos < matches.length; pos++){
					// 		let groupText = matches[pos][1];
					// 		if(groupText && groupText.length > 0) {
					// 			newLine += ' ' + groupText.charAt(0).toUpperCase() + groupText.substring(1).toLowerCase();
					// 		} else {
					// 			newLine += ' ' + matches[pos][0];
					// 		}
					// 	}
					// }
					newLine += formatCommonParams(/(left|right|middle|move|down|up|click|doubleclick|at|offset)|@[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}\d+/ig, partParam);
				}
			}

			// If current line can't be formated, then ...
			if (newLine.length < 1) {
				newLine = util.format('%s%s', curIndent, curLine);
			}

			// Add to formated text
			formatedText += newLine + '\n';
		} else {
			formatedText += '\n';
		}
	}

	return formatedText;
}
