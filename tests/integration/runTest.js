const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  downloadAndUnzipVSCode,
  resolveCliPathFromVSCodeExecutablePath,
  runTests
} = require("@vscode/test-electron");

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

async function resolveVsCodeCliPath() {
  const installedPath = resolveVsCodeExecutablePath();
  if (installedPath) {
    if (installedPath.toLowerCase().endsWith(".exe")) {
      return resolveCliPathFromVSCodeExecutablePath(installedPath);
    }
    return installedPath;
  }

  const downloadedPath = await downloadAndUnzipVSCode();
  return resolveCliPathFromVSCodeExecutablePath(downloadedPath);
}

async function removeDirectoryWithRetries(directory, attempts = 20, delayMs = 250) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.rmSync(directory, { recursive: true, force: true });
      return true;
    } catch (error) {
      const code = error && typeof error === "object" ? error.code : undefined;
      const retryable = code === "EPERM" || code === "EBUSY" || code === "ENOTEMPTY";
      if (!retryable || attempt === attempts) {
        console.warn(
          `Warning: failed to remove temporary test directory ${directory}:`,
          error
        );
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const templateWorkspace = path.join(__dirname, "workspace-template");
  const tempWorkspace = fs.mkdtempSync(
    path.join(os.tmpdir(), "tctidier-workspace-")
  );
  const userDataDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tctidier-userdata-")
  );
  const extensionsDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "tctidier-extensions-")
  );
  const extensionDevelopmentPath = repoRoot;
  const extensionTestsPath = path.join(__dirname, "suite");
  const vscodeExecutablePath = await resolveVsCodeCliPath();

  fs.cpSync(templateWorkspace, tempWorkspace, { recursive: true });
  process.env.TCTIDIER_TEST_WORKSPACE = tempWorkspace;

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      vscodeExecutablePath,
      launchArgs: [
        "--disable-extensions",
        "--disable-updates",
        "--skip-release-notes",
        "--skip-welcome",
        "--disable-workspace-trust",
        `--user-data-dir=${userDataDir}`,
        `--extensions-dir=${extensionsDir}`,
        tempWorkspace
      ]
    });
  } finally {
    await removeDirectoryWithRetries(tempWorkspace);
    await removeDirectoryWithRetries(userDataDir);
    await removeDirectoryWithRetries(extensionsDir);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
