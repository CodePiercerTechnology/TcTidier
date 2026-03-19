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

async function openAndFormatDocument(filePath, expectedPath) {
  const expected = normalizeLineEndings(fs.readFileSync(expectedPath, "utf8"));
  const document = await vscode.workspace.openTextDocument(filePath);
  const editor = await vscode.window.showTextDocument(document);

  await vscode.commands.executeCommand("editor.action.formatDocument");
  await waitFor(() => normalizeLineEndings(editor.document.getText()) === expected);

  assert.equal(normalizeLineEndings(editor.document.getText()), expected);
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
