// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import util = require('util');
import { Buffer } from 'buffer';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const myChannel = vscode.window.createOutputChannel("ScriptPro");

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
		//Create output channel
		myChannel.clear();
		myChannel.show(false);

		const path = require("path");
		const editor = vscode.window.activeTextEditor;
		if (editor != null) {
			let scriptPath = editor.document.fileName;
			if (editor.document.isDirty) {
				vscode.window.showErrorMessage('Please save the script before run it!');
				return;
			}

			// Prepare parameters
			const baseDir = context.extensionPath;
			const localConfig = vscode.workspace.getConfiguration('scriptpro');

			//DEBUG
			console.log('[D]scriptpro.playerPath: ' + localConfig.get<string>('playerPath'));
			console.log('[D]scriptpro.silent: ' + localConfig.get<boolean>('silent'));

			const process = require('child_process')
			let payerPath = path.resolve(baseDir, localConfig.get<string>('playerPath', 'bin/ScriptPlayer.exe'));
			let silentFlag = (localConfig.get<boolean>('silent', true) ? '/silent' : '');

			// Run script
			myChannel.appendLine('[i]Start ' + scriptPath);
			myChannel.appendLine('[i]Press "Ctrl+T" to stop the script.');
			vscode.window.showInformationMessage('Start ' + scriptPath);
			vscode.window.showInformationMessage('Press "Ctrl+T" to stop the script.');

			let cmdSpawn = process.spawn(payerPath, [ scriptPath, silentFlag ]);
			cmdSpawn.stdout.on('data', function (data:any) {
				const strData:string = data.toString();
				console.log(strData);
				myChannel.append(strData);
			});
			
			cmdSpawn.stderr.on('data', function (data:any) {
				console.log('[E]StdErr: ' + data.toString());
				let dataStr = data.toString().trim();
				if(dataStr.length > 0) {
					dataStr = Buffer.from(dataStr, 'base64').toString().trim();
					myChannel.appendLine('[E]' + dataStr);

					let errorMsg = dataStr;
					let pos = dataStr.indexOf('*');
					let errorFile = '';
					if(pos >= 0) {
						errorFile = errorMsg.substring(0, pos).trim();
						errorMsg = dataStr.substring(pos + 1);
					}

					if(errorFile.toLowerCase() == editor.document.fileName.toLowerCase()) {
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
					} else {
						vscode.window.showErrorMessage(errorFile + '\n  *' + errorMsg, { modal: true });
					}
				}
			});
			
			cmdSpawn.on('close', function (code:number) {
				let logStr = '[i]Script "' + scriptPath + '" stoped with code: ' + code;
				console.log(logStr);
				myChannel.appendLine(logStr);
				vscode.window.showInformationMessage('Stoped ' + scriptPath);
			});

			cmdSpawn.stdout.on('error', function (err:any) {
				let logStr = '[E]Error' + err.toString();
				console.log(logStr);
				myChannel.appendLine(logStr);
				vscode.window.showErrorMessage('Failed to start script player!');
			});
		}
	});
	context.subscriptions.push(runDisposable);

	let toolDisposable = vscode.commands.registerCommand('scriptpro.tool', () => {
		//Create output channel
		myChannel.clear();
		myChannel.show(false);

		const path = require("path");
		const editor = vscode.window.activeTextEditor;
		if (editor != null) {
			let scriptPath = editor.document.fileName;

			// Prepare parameters
			const baseDir = context.extensionPath;
			const localConfig = vscode.workspace.getConfiguration('scriptpro');

			const process = require('child_process')
			let payerPath = path.resolve(baseDir, localConfig.get<string>('playerPath', 'bin/ScriptPlayer.exe'));
			let silentFlag = (localConfig.get<boolean>('silent', true) ? '/tool' : '');

			// Run script
			myChannel.appendLine('[i]Open script tool.');
	
			let cmdSpawn = process.spawn(payerPath, [ scriptPath, silentFlag ]);
			cmdSpawn.stdout.on('data', function (data:any) {
				const strData:string = data.toString().trim();
				console.log(strData);
				if(strData.startsWith('[RECORD]')) {
					myChannel.appendLine('[i]Recieve recorded actions.');
					const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
					const curRange = new vscode.Range(
						lastLine.range.start,
						lastLine.range.end
					);
					editor.edit((builder: vscode.TextEditorEdit) => {
						let scriptBlock = Buffer.from(strData.substring(8), 'base64').toString();
						builder.replace(curRange, scriptBlock);
						//builder.insert(lastLine.range.end, scriptBlock);
					});
				} else if(strData.startsWith('[INSERT]')) {
					myChannel.appendLine('[i]Insert action.');
					const curRange = new vscode.Range(
						editor.selection.active,
						editor.selection.active
					);
					editor.edit((builder: vscode.TextEditorEdit) => {
						let scriptBlock = Buffer.from(strData.substring(8), 'base64').toString();
						builder.replace(curRange, scriptBlock);
						//builder.insert(lastLine.range.end, scriptBlock);
					});
				} else {
					myChannel.appendLine(strData);
				}
			});
			
			cmdSpawn.stderr.on('data', function (data:any) {
				console.log('[E]stderr: ' + data.toString());
				myChannel.appendLine('[E]' + Buffer.from(data.toString(), 'base64').toString());
			});

			cmdSpawn.on('close', function (code:number) {
				let logStr = '[i]Script tool stoped with code: ' + code;
				console.log(logStr);
				myChannel.appendLine(logStr);
			});

			cmdSpawn.stdout.on('error', function (err:any) {
				let logStr = '[E]Error' + err.toString();
				console.log(logStr);
				myChannel.appendLine(logStr);
				vscode.window.showErrorMessage('Failed to start script tool!');
			});
		}
	});
	context.subscriptions.push(toolDisposable);

	let upperDisposable = vscode.commands.registerCommand('scriptpro.upper', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor != null && editor.selection != null) {
			let selectedText = editor.document.getText(editor.selection).trim();

			if(selectedText.length > 0) {
				editor.edit((builder: vscode.TextEditorEdit) => {
					builder.replace(editor.selection, selectedText.toUpperCase());
				});
			}
		}
	});
	context.subscriptions.push(upperDisposable);

	let lowerDisposable = vscode.commands.registerCommand('scriptpro.lower', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor != null && editor.selection != null) {
			let selectedText = editor.document.getText(editor.selection).trim();

			if(selectedText.length > 0) {
				editor.edit((builder: vscode.TextEditorEdit) => {
					builder.replace(editor.selection, selectedText.toLowerCase());
				});
			}
		}
	});
	context.subscriptions.push(lowerDisposable);

	let properDisposable = vscode.commands.registerCommand('scriptpro.proper', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor != null && editor.selection != null) {
			let selectedText = editor.document.getText(editor.selection).trim();

			if(selectedText.length > 0) {
				editor.edit((builder: vscode.TextEditorEdit) => {
					selectedText = selectedText.charAt(0).toUpperCase() + selectedText.substring(1).toLowerCase();
					console.log('[D]ProperCase: ' + selectedText);
					builder.replace(editor.selection, selectedText);
				});
			}
		}
	});
	context.subscriptions.push(properDisposable);
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
			params += ' ' + curMatch[0].trim();
		}
	}

	return params;
}

function formatScript(text: string): string {
	let formatedText: string = '';
	let lines = text.split('\n');
	let curIndent: string = '';
	let isCode = false;

	for (const i in lines) {
		let curLine: string = lines[i].trimEnd();
		let pos: number;
		let partAction: string, partParam: string;
		let newLine: string = '';

		if (curLine.length > 0) {
			if (isCode) {
				if (curLine.trim().toLowerCase().endsWith('endcode')) {
					//if (curIndent.length > 0) curIndent = curIndent.substring(1);
					newLine = curIndent + 'EndCode';
					isCode = false;
				} else {
					newLine = curIndent + curLine;
				}
			} else {
				curLine = curLine.trim().replace('\t', ' ');
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
					if (partAction == 'code') {
						newLine = curIndent + 'Code';
						const match = partParam.match(/"([^"]+)"/i);
						if (match) {
							newLine += ' "' + match[1].trim().toUpperCase() + '"';
						} else {
							newLine += ' "C#"';
						}
						isCode = true;
						//curIndent += '\t';
					} else if (partAction == 'if') {
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
						const matches = matchAll(/"[^"]*"|(BtnOK|BtnOKCancel|IconInfo|IconWarn|IconError|IconQuestion)|@[a-zA-Z_]+[a-zA-Z0-9_]*|[0-9\.]+/ig, partParam);

						console.log(matches);
						newLine = curIndent + 'MsgBox';
						for(pos = 0; pos < matches.length; pos++) {
							if(matches[pos][1]){
								let strItem = matches[pos][1].toLowerCase();
								if(strItem.indexOf('btnok') >= 0) {
									newLine += " BtnOK";
								} else if(strItem.indexOf('btnokcancel') >= 0) {
									newLine += " BtnOKCancel";
								} else if(strItem.indexOf('iconinfo') >= 0) {
									newLine += " IconInfo";
								} else if(strItem.indexOf('iconwarn') >= 0) {
									newLine += " IconWarn";
								} else if(strItem.indexOf('iconerror') >= 0) {
									newLine += " IconError";
								} else if(strItem.indexOf('iconquestion') >= 0) {
									newLine += " IconQuestion";
								}
							} else {
								newLine += ' ' + matches[pos][0];
							}
						}
					} else if (partAction == 'format') {
						newLine = curIndent + 'Format'
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
							+ formatCommonParams(/(at|offset)|#[0-9A-F]{1,6}:{0,1}[0-9A-F]{0,2}|@[a-zA-Z_]+[a-zA-Z0-9_]*|[ \t,]+-{0,1}[0-9]+/ig, partParam);
					} else if (partAction == 'findpixel') {
						newLine = curIndent + 'FindPixel'
							+ formatCommonParams(/(inrect|repeat)|#[0-9A-F]{1,6}:{0,1}[0-9A-F]{0,2}|@{0,1}[a-zA-Z_]+[a-zA-Z0-9_]*|[ \t,]+-{0,1}[0-9]+/ig, partParam);
					} else if (partAction == 'findmodel') {
						newLine = curIndent + 'FindModel'
							+ formatCommonParams(/(inrect|preload|wait|by)|#[0-9A-F]{1,6}:{0,1}[0-9A-F]{0,2}|"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|[ \t,]+-{0,1}[0-9]+/ig, partParam);
					} else if (partAction == 'capture') {
						newLine = curIndent + 'Capture'
							+ formatCommonParams(/(screen|window|client|rect|to|file)|"[^"]*"|@[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}[0-9]+/ig, partParam);
					} else if (partAction == 'key') {
						newLine = curIndent + 'Key'
							+ formatCommonParams(/(down|up|press)|[a-zA-Z0-9]+/ig, partParam);
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
						newLine = curIndent + 'Mouse';
						newLine += formatCommonParams(/(left|right|middle|move|down|up|click|doubleclick|at|offset)|@[a-zA-Z_]+[a-zA-Z0-9_]*|-{0,1}\d+/ig, partParam);
					}
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
