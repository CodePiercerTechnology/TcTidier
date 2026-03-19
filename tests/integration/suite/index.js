const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n");
}

async function waitFor(predicate, timeoutMs = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error("Timed out waiting for expected editor state.");
}

async function waitForDocumentReady(document, timeoutMs = 5000) {
  await waitFor(() => {
    const activeEditor = vscode.window.activeTextEditor;
    return (
      activeEditor?.document.uri.toString() === document.uri.toString() &&
      document.languageId === "twincat-st"
    );
  }, timeoutMs);
}

async function openAndFormatDocument(filePath, expectedPath) {
  const expected = normalizeLineEndings(fs.readFileSync(expectedPath, "utf8"));
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);
  await waitForDocumentReady(document);

  const edits = await vscode.commands.executeCommand(
    "vscode.executeFormatDocumentProvider",
    document.uri,
    {
      insertSpaces: true,
      tabSize: 4
    }
  );

  assert.ok(Array.isArray(edits), "Expected formatting edits from provider");
  assert.ok(edits.length > 0, "Expected formatter to return at least one edit");

  const workspaceEdit = new vscode.WorkspaceEdit();
  for (const edit of edits) {
    workspaceEdit.replace(document.uri, edit.range, edit.newText);
  }

  const applied = await vscode.workspace.applyEdit(workspaceEdit);
  assert.equal(applied, true, "Expected document formatting edits to apply");

  await waitFor(() => normalizeLineEndings(document.getText()) === expected);
  assert.equal(normalizeLineEndings(document.getText()), expected);
}

async function formatWorkspaceAndVerify(filePath, expectedPath) {
  const expected = normalizeLineEndings(fs.readFileSync(expectedPath, "utf8"));

  await vscode.commands.executeCommand("tctidier.formatWorkspace");
  await waitFor(
    () => normalizeLineEndings(fs.readFileSync(filePath, "utf8")) === expected
  );

  assert.equal(normalizeLineEndings(fs.readFileSync(filePath, "utf8")), expected);
}

async function activateExtension() {
  const extension = vscode.extensions.getExtension(
    "CodePiercerTechnologies.tctidier"
  );

  assert.ok(extension, "TcTidier extension should be available");
  await extension.activate();
}

async function run() {
  const workspaceRoot = process.env.TCTIDIER_TEST_WORKSPACE;
  assert.ok(workspaceRoot, "Expected integration workspace path");

  await activateExtension();

  await openAndFormatDocument(
    path.join(workspaceRoot, "document-format.st"),
    path.join(workspaceRoot, "document-format.expected.st")
  );

  await formatWorkspaceAndVerify(
    path.join(workspaceRoot, "workspace-format.TcPOU"),
    path.join(workspaceRoot, "workspace-format.expected.TcPOU")
  );
}

module.exports = {
  run
};
