const fs = require("fs");
const path = require("path");
const { runTests } = require("@vscode/test-electron");

function resolveVsCodeExecutablePath() {
  const candidates = [
    process.env.VSCODE_EXECUTABLE_PATH,
    "C:\\Users\\TwinCAT\\AppData\\Local\\Programs\\Microsoft VS Code\\bin\\code.cmd",
    "C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd",
    "C:\\Program Files (x86)\\Microsoft VS Code\\bin\\code.cmd",
    "C:\\Users\\TwinCAT\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe",
    "C:\\Program Files\\Microsoft VS Code\\Code.exe",
    "C:\\Program Files (x86)\\Microsoft VS Code\\Code.exe"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const templateWorkspace = path.join(__dirname, "workspace-template");
  const tempWorkspace = path.join(__dirname, ".tmp-workspace");
  const extensionDevelopmentPath = repoRoot;
  const extensionTestsPath = path.join(__dirname, "suite");
  const vscodeExecutablePath = resolveVsCodeExecutablePath();

  fs.rmSync(tempWorkspace, { recursive: true, force: true });
  fs.cpSync(templateWorkspace, tempWorkspace, { recursive: true });
  process.env.TCTIDIER_TEST_WORKSPACE = tempWorkspace;

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      vscodeExecutablePath,
      launchArgs: ["--disable-extensions", tempWorkspace]
    });
  } finally {
    fs.rmSync(tempWorkspace, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
