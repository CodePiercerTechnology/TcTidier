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
  const result = tryCreateFormattingEdits(context, document, token);
  if (result.error) {
    void vscode.window.showErrorMessage(`TcTidier: ${result.error}`);
  }
  return result.edits;
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
  let unchangedCount = 0;
  let skippedDirtyCount = 0;
  const failedFiles: string[] = [];

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
        const result = tryCreateFormattingEdits(context, document, token);
        if (result.error) {
          failedFiles.push(vscode.workspace.asRelativePath(uri));
          continue;
        }

        if (result.edits.length === 0) {
          unchangedCount += 1;
          continue;
        }

        const workspaceEdit = new vscode.WorkspaceEdit();
        for (const edit of result.edits) {
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

  const summary = [
    `formatted ${formattedCount}`,
    `unchanged ${unchangedCount}`
  ];

  if (skippedDirtyCount > 0) {
    summary.push(`skipped dirty ${skippedDirtyCount}`);
  }

  if (failedFiles.length > 0) {
    summary.push(`failed ${failedFiles.length}`);
    void vscode.window.showWarningMessage(
      `TcTidier: Workspace formatting completed with failures: ${summary.join(", ")}.`,
      "Show Failed Files"
    ).then((selection) => {
      if (selection === "Show Failed Files") {
        void vscode.window.showInformationMessage(
          `TcTidier failed files: ${failedFiles.join(", ")}`
        );
      }
    });
    return;
  }

  void vscode.window.showInformationMessage(
    `TcTidier: Workspace formatting completed: ${summary.join(", ")}.`
  );
}

function tryCreateFormattingEdits(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument,
  token: vscode.CancellationToken
): { edits: vscode.TextEdit[]; error: string | null } {
  try {
    const source = document.getText();
    const formatted = runFormatter(context, document, source, token);
    if (formatted === source) {
      return { edits: [], error: null };
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(source.length)
    );

    return {
      edits: [vscode.TextEdit.replace(fullRange, formatted)],
      error: null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { edits: [], error: message };
  }
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
