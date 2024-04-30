// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { basename, extname } from 'path';
interface NameAndParamsResult {
    functionName: string;
    params: string[];
}

const matchPattern: RegExp = /(?:\b(\w+)[.:])?(\w+)\s*\(([^)]*)\)/;
const paramOnlyPattern: RegExp = /(\w+)\s*,\s*(\w+)/;
const matchSingleParam: RegExp = /^(\b\w+)$/;

function nameAndParams(luaCode: string): NameAndParamsResult {
    let functionName: string = '';
    let params: string[] = [];
    // 执行匹配操作
    const matchResult: RegExpMatchArray | null = luaCode.match(matchPattern);
    if (matchResult) {
        functionName = matchResult[2]; // 函数名
        params = matchResult[3].split(',').map(param => param.trim()); // 参数列表
    } else {
        // 对于纯参数列表，我们可以单独处理
        const paramMatchResult: RegExpMatchArray | null = luaCode.match(paramOnlyPattern);
        if (paramMatchResult) {
            params = luaCode.split(',').map(param => param.trim());
        } else {
            // 尝试匹配单个参数
            const matchParamResult: RegExpMatchArray | null = luaCode.match(matchSingleParam);
            if (matchParamResult) {
                params = [matchParamResult[1].trim()];
            } else {
                console.log('没有匹配到符合要求的Lua函数调用或参数列表。');
            }
        }
    }
    return { functionName, params };
}

function logWithParams(logLevel:string, baseName: string, functionName: string, params: string[]): string {
    let func = functionName ? `.${functionName}` : '';
    const message = `${logLevel}("${baseName}${func}: ${params.map(p => `{${p}}`).join(' ')}", ${params.join(', ')})`;
    return message;
}

function interpolate(str: string, params: object) {
    const names = Object.keys(params);
    const vals = Object.values(params);
    return new Function(...names, `return \`${str}\`;`)(...vals);
}

interface WrapCommandOptions {
    wrapFlagKey: string;
    wrapStrKey: string;
    commandKey: string;
    processSelectedText: (selectedText: string, wrapstr:string, fileName: string) => string;
}

function registerWrapCommand(context: vscode.ExtensionContext, options: WrapCommandOptions) {
    const wrapFlag = vscode.workspace.getConfiguration().get<boolean>(options.wrapFlagKey);
    if (!wrapFlag) return;

    const command = vscode.commands.registerCommand(options.commandKey, () => {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            console.log("No open text editor");
            return;
        }

        const wrapstr = vscode.workspace.getConfiguration().get<string>(options.wrapStrKey);
        if (!wrapstr) {
            return;
        }

        insertWrapText(editor, wrapstr, options.processSelectedText);
    });

    context.subscriptions.push(command);
}

function insertWrapText(editor: vscode.TextEditor, wrapstr: string, processSelectedText: (selectedText: string, wrapstr:string, fileName: string) => string) {
    const document = editor.document;
    const fileName = document.uri.fsPath; // fsPath gives you the file system path

    const editRange = editor.document.lineAt(editor.selection.end.line).range.end;
    let selectedText = editor.document.getText(editor.selection);
    let prefix = getCurrentLineIndent(editor);

    if (selectedText === "") {
        selectedText = "temp";
    }

    selectedText = processSelectedText(selectedText, wrapstr, fileName);

    const prefixStr = `\n${prefix}`;
    editor.edit(editBuilder => {
        editBuilder.insert(editRange, prefixStr + selectedText);
    });
}

function getLineSpace(editor: vscode.TextEditor, line: number) {
    const currentLine = editor.document.lineAt(line);
    const matchArr = currentLine.text.match(/^\s+/);
    return matchArr ? matchArr[0] : "";
}

function isEmpty(str: string | null | undefined): boolean {
    return !str;
}

function getCurrentLineIndent(editor: vscode.TextEditor): string {
    const currentLine = editor.selection.active.line;
    let matchStr = getLineSpace(editor, currentLine)
    if (isEmpty(matchStr)) {
        const nextLine = editor.selection.active.line + 1;
        matchStr = getLineSpace(editor, nextLine)
    }
    return matchStr
}

export function activate(context: vscode.ExtensionContext) {
    registerWrapCommand(context, {
        wrapFlagKey: 'extendcode.wrapcode_flag',
        wrapStrKey: 'extendcode.wrapstr',
        commandKey: 'extendcode.wrapCode',
        processSelectedText: (selectedText, wrapstr, fileName) => {
            const text = interpolate(wrapstr, {
                selectedText: selectedText
            });
            return text;
        }
    });

    registerWrapCommand(context, {
        wrapFlagKey: 'extendcode.wraplog_flag',
        wrapStrKey: 'extendcode.wraplog_str',
        commandKey: 'extendcode.wrapLog',
        processSelectedText: (selectedText, wrapstr, fileName) => {
            const ext = extname(fileName);
            const baseName = basename(fileName, ext);
            // console.log(`Current base file name: ${baseName}`);
            let { functionName, params } = nameAndParams(selectedText);
            // console.log(`函数名：${functionName}`);
            // console.log(`参数列表：`, params);
            return logWithParams(wrapstr, baseName, functionName, params);
        }
    });

}

// This method is called when your extension is deactivated
export function deactivate() { }
