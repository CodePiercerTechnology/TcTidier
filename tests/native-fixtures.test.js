const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { formatDocumentText } = require("../out/native/formatter");

const ROOT = path.resolve(__dirname, "..");
const FIXTURE_INPUT_DIR = path.join(__dirname, "fixtures", "input");
const FIXTURE_EXPECTED_DIR = path.join(__dirname, "fixtures", "expected");
const SAMPLE_EXTENSIONS = new Set([".TcPOU", ".TcGVL", ".TcDUT", ".TcIO"]);

const fixtures = fs
  .readdirSync(FIXTURE_INPUT_DIR)
  .filter((entry) => SAMPLE_EXTENSIONS.has(path.extname(entry)))
  .sort();

test("fixture snapshots exist", () => {
  assert.ok(fixtures.length > 0, "expected at least one fixture");

  for (const fixture of fixtures) {
    const expectedPath = path.join(FIXTURE_EXPECTED_DIR, fixture);
    assert.ok(
      fs.existsSync(expectedPath),
      `missing expected snapshot for ${fixture}`
    );
  }
});

for (const fixture of fixtures) {
  test(`formats fixture ${fixture}`, () => {
    const inputPath = path.join(FIXTURE_INPUT_DIR, fixture);
    const expectedPath = path.join(FIXTURE_EXPECTED_DIR, fixture);
    const input = fs.readFileSync(inputPath, "utf8");
    const expected = fs.readFileSync(expectedPath, "utf8");

    const actual = formatDocumentText(input, {
      stdinFilepath: inputPath,
      workspaceRoot: ROOT
    });

    assert.equal(actual, expected);
    assert.equal(
      formatDocumentText(actual, {
        stdinFilepath: inputPath,
        workspaceRoot: ROOT
      }),
      expected,
      `formatter should be idempotent for ${fixture}`
    );
  });
}
