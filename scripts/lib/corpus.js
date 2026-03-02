const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SOURCE_EXTENSIONS = new Set([".TcPOU", ".TcGVL", ".TcDUT", ".TcIO"]);
const FIXTURE_INPUT_DIR = path.join(ROOT, "tests", "fixtures", "input");
function listSourceFiles(folder) {
  if (!fs.existsSync(folder)) {
    return [];
  }

  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name)))
    .map((entry) => path.join(folder, entry.name))
    .sort();
}

function loadFiles(filePaths) {
  return filePaths.map((filePath) => ({
    name: path.relative(ROOT, filePath),
    filePath,
    text: fs.readFileSync(filePath, "utf8")
  }));
}

function loadCorpus() {
  return loadFiles(listSourceFiles(FIXTURE_INPUT_DIR));
}

module.exports = {
  ROOT,
  loadCorpus
};
