import * as vscode from "vscode";
import { formatDocumentText } from "./native/formatter";

const SUPPORTED_LANGUAGES = new Set([
  "twincat-st",
  "structured-text",
  "iecst",
  "iec-st"
]);

const SUPPORTED_EXTENSIONS = new Set([
  ".tcpou",
  ".tcgvl",
  ".tcdut",
  ".tcio",
  ".st",
  ".iecst"
]);

const WORKSPACE_FILE_GLOB = "**/*.{TcPOU,TcGVL,TcDUT,TcIO,st,iecst}";

const FORMATTER_SELECTORS: vscode.DocumentSelector = [
  { language: "twincat-st" },
  { language: "structured-text" },
  { language: "iecst" },
  { language: "iec-st" },
  { scheme: "twincat", language: "iec-st" },
  { scheme: "file", pattern: "**/*.TcPOU" },
  { scheme: "file", pattern: "**/*.TcGVL" },
  { scheme: "file", pattern: "**/*.TcDUT" },
  { scheme: "file", pattern: "**/*.TcIO" },
  { scheme: "file", pattern: "**/*.st" },
  { scheme: "file", pattern: "**/*.iecst" },
  { scheme: "untitled", language: "twincat-st" },
  { scheme: "untitled", language: "structured-text" },
  { scheme: "untitled", language: "iecst" },
  { scheme: "untitled", language: "iec-st" }
];

export function activate(context: vscode.ExtensionContext): void {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.name = "TcTidier Format";
  statusBarItem.text = "$(wand) TcTidier";
  statusBarItem.tooltip = "Format current TwinCAT document";
  statusBarItem.command = "tctidier.formatDocument";

  const provider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document, _options, token) {
      return provideFormattingEdits(context, document, token);
    }
  };

  context.subscriptions.push(
    statusBarItem,
    vscode.languages.registerDocumentFormattingEditProvider(
      FORMATTER_SELECTORS,
      provider
    ),
    vscode.commands.registerTextEditorCommand(
      "tctidier.formatDocument",
      async (editor) => {
        await vscode.commands.executeCommand("editor.action.formatDocument");
        return editor;
      }
    ),
    vscode.commands.registerCommand("tctidier.formatWorkspace", async () => {
      await formatWorkspaceFiles(context);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateStatusBar(statusBarItem, editor?.document);
    }),
    vscode.workspace.onDidOpenTextDocument((document) => {
      const activeDocument = vscode.window.activeTextEditor?.document;
      if (activeDocument && document === activeDocument) {
        updateStatusBar(statusBarItem, document);
      }
    })
  );

  updateStatusBar(statusBarItem, vscode.window.activeTextEditor?.document);
}

function provideFormattingEdits(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): vscode.TextEdit[] {
  try {
    const source = document.getText();
    const formatted = runFormatter(context, document, source, token);
    if (formatted === source) {
      return [];
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(source.length)
    );

    return [vscode.TextEdit.replace(fullRange, formatted)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`TcTidier: ${message}`);
    return [];
  }
}

function runFormatter(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  source: string,
  token: vscode.CancellationToken
): string {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const workspaceRoot = workspaceFolder
    ? workspaceFolder.uri.fsPath
    : context.extensionPath;

  if (token.isCancellationRequested) {
    return source;
  }

  return formatDocumentText(source, {
    stdinFilepath: document.uri.scheme === "file" ? document.uri.fsPath : null,
    workspaceRoot
  });
}

export function deactivate(): void {}

async function formatWorkspaceFiles(
  context: vscode.ExtensionContext
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    void vscode.window.showWarningMessage(
      "TcTidier: Open a workspace folder to format TwinCAT files."
    );
    return;
  }

  const files = await vscode.workspace.findFiles(
    WORKSPACE_FILE_GLOB,
    "{**/.git/**,**/node_modules/**,**/out/**,**/dist/**,**/build/**}"
  );

  if (files.length === 0) {
    void vscode.window.showInformationMessage(
      "TcTidier: No TwinCAT files were found in the workspace."
    );
    return;
  }

  let formattedCount = 0;
  let skippedDirtyCount = 0;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "TcTidier: Formatting workspace files",
      cancellable: true
    },
    async (progress, token) => {
      for (const [index, uri] of files.entries()) {
        if (token.isCancellationRequested) {
          break;
        }

        progress.report({
          increment: 100 / files.length,
          message: `${index + 1}/${files.length} ${vscode.workspace.asRelativePath(uri)}`
        });

        const openDocument = vscode.workspace.textDocuments.find(
          (document) => document.uri.toString() === uri.toString()
        );
        if (openDocument?.isDirty) {
          skippedDirtyCount += 1;
          continue;
        }

        const document = openDocument || (await vscode.workspace.openTextDocument(uri));
        const edits = provideFormattingEdits(context, document, token);
        if (edits.length === 0) {
          continue;
        }

        const workspaceEdit = new vscode.WorkspaceEdit();
        for (const edit of edits) {
          workspaceEdit.replace(uri, edit.range, edit.newText);
        }

        const applied = await vscode.workspace.applyEdit(workspaceEdit);
        if (!applied) {
          throw new Error(`Failed to apply edits to ${uri.fsPath}`);
        }

        await document.save();
        formattedCount += 1;
      }
    }
  );

  void vscode.window.showInformationMessage(
    skippedDirtyCount > 0
      ? `TcTidier: Formatted ${formattedCount} of ${files.length} workspace files. Skipped ${skippedDirtyCount} dirty file(s).`
      : `TcTidier: Formatted ${formattedCount} of ${files.length} workspace files.`
  );
}

function updateStatusBar(
  statusBarItem: vscode.StatusBarItem,
  document: vscode.TextDocument | undefined
): void {
  if (document && isSupportedDocument(document)) {
    statusBarItem.show();
    return;
  }

  statusBarItem.hide();
}

function isSupportedDocument(document: vscode.TextDocument): boolean {
  if (SUPPORTED_LANGUAGES.has(document.languageId)) {
    return true;
  }

  const path = document.uri.path.toLowerCase();
  for (const extension of SUPPORTED_EXTENSIONS) {
    if (path.endsWith(extension)) {
      return true;
    }
  }

  return false;
}
