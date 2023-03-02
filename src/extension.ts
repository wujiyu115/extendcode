// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extendcode.wrapCode', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.log("No open text editor");
            return
        }

        function interpolate(str: string, params: object) {
            const names = Object.keys(params);
            const vals = Object.values(params);
            return new Function(...names, `return \`${str}\`;`)(...vals);
        }
    
        const wrapstr = vscode.workspace.getConfiguration().get<string>('extendcode.wrapstr');
        if (!wrapstr) {
            return;
        }
        const editRange = editor.document.lineAt(editor.selection.end.line).range.end;
        let selectedText = editor.document.getText(editor.selection);
        let reg = /^\s+/
        editor.edit(editBuilder => {
            if (editor !== undefined) {

                const curLine = editor.document.lineAt(editor.selection.active.line);
                const textRange = new vscode.Range(curLine.range.start, curLine.range.end);
                const selectLineText = editor.document.getText(textRange)
                const matchArr = selectLineText.match(reg)
                let prefix = ""
                if (!matchArr) {
                    prefix = ""
                } else {
                    prefix = matchArr[0]
                }
                if (selectedText == "") {
                    selectedText = "temp"
                }
                
                const prefixStr = `\n${prefix}`;
                const text = interpolate(wrapstr, {
                    selectedText: selectedText
                })
                editBuilder.insert(editRange, prefixStr + text);
            }
        });
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
