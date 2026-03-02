const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createConfig, loadConfig } = require("../out/native/config");
const { splitArguments, cleanLine } = require("../out/native/helpers");
const {
  alignAssignments,
  alignDeclarations,
  alignVarsGlobally
} = require("../out/native/alignment");
const {
  StringProtector,
  extractIgnoreLines,
  normalizeParenthesesSpacing
} = require("../out/native/protection");
const { normalizeBlankLines, fixDoubleSemicolons } = require("../out/native/whitespace");
const { indentLines } = require("../out/native/indentation");
const { formatText } = require("../out/native/formatter");

test("loadConfig reads and caches project config", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tctidier-config-"));
  const projectRoot = path.join(tempRoot, "project");
  const nestedRoot = path.join(projectRoot, "nested", "folder");
  fs.mkdirSync(nestedRoot, { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, ".tctidier.json"),
    JSON.stringify({
      useTabs: false,
      indent: 2,
      respectIgnore: false
    }),
    "utf8"
  );

  const first = loadConfig({ workspaceRoot: nestedRoot });
  const second = loadConfig({ workspaceRoot: nestedRoot });

  assert.equal(first.useTabs, false);
  assert.equal(first.indent, 2);
  assert.equal(first.respectIgnore, false);
  assert.equal(first.indentStr, "  ");
  assert.strictEqual(first, second);
});

test("splitArguments respects nested parentheses", () => {
  assert.deepEqual(splitArguments("A, Call(B, C), D(E(F), G), H"), [
    "A",
    "Call(B, C)",
    "D(E(F), G)",
    "H"
  ]);
});

test("cleanLine strips comments and protects multiline comment state", () => {
  const state = { active: false };
  assert.equal(cleanLine("value := 'abc'; // note", state), "value := '';");
  assert.equal(cleanLine("start (* comment", state), "start");
  assert.equal(state.active, true);
  assert.equal(cleanLine("still comment", state), "");
  assert.equal(cleanLine("end *) tail", state), " tail");
  assert.equal(state.active, false);
});

test("StringProtector restores repeated placeholders in one pass", () => {
  const protector = new StringProtector();
  const protectedLine = protector.protect("A := 'one'; B := 'two';");
  assert.match(protectedLine, /__STRING_1__/);
  assert.match(protectedLine, /__STRING_2__/);
  assert.equal(
    protector.restore(`${protectedLine}\n${protectedLine}`),
    "A := 'one'; B := 'two';\nA := 'one'; B := 'two';"
  );
});

test("extractIgnoreLines handles line and block markers", () => {
  const ignored = extractIgnoreLines(
    [
      "// tctidier-ignore",
      "value := 1;",
      "(* tctidier-ignore-start *)",
      "x:=2;",
      "y:=3;",
      "(* tctidier-ignore-end *)"
    ],
    true
  );

  assert.deepEqual([...ignored], [0, 2, 3, 4, 5]);
});

test("alignment helpers normalize declarations and assignments", () => {
  const config = createConfig({ useTabs: false, indent: 4 });
  const declarations = alignDeclarations(
    ["foo:INT;", "longerName:BOOL;\t", "END_VAR"],
    config
  );
  assert.deepEqual(declarations, [
    "    foo        : INT;",
    "    longerName : BOOL;",
    "END_VAR"
  ]);

  const vars = alignVarsGlobally(
    ["VAR", "foo:INT;", "longerName:BOOL; // c", "END_VAR"],
    config
  );
  assert.deepEqual(vars, [
    "VAR",
    "    foo        : INT;",
    "    longerName : BOOL; // c",
    "END_VAR"
  ]);

  const assignments = alignAssignments(["  value:=Call(); // ok"], config);
  assert.deepEqual(assignments, ["  value := Call(); // ok"]);
});

test("whitespace helpers normalize repeated gaps and semicolons", () => {
  assert.deepEqual(normalizeBlankLines(["A", "", "", "B", "", ""]), ["A", "", "B", ""]);
  assert.deepEqual(fixDoubleSemicolons(["A;;", "B;;;;"]), ["A;", "B;;"]);
});

test("indentLines normalizes one-line IF and CASE blocks", () => {
  const config = createConfig({ useTabs: false, indent: 4 });
  const indented = indentLines(
    [
      "IF flag THEN value:=1; END_IF",
      "CASE state OF",
      "STATE_IDLE:",
      "value:=0;",
      "END_CASE"
    ],
    config
  );

  assert.deepEqual(indented, [
    "IF flag THEN",
    "    value:=1;",
    "END_IF",
    "CASE state OF",
    "",
    "    STATE_IDLE:",
    "        value:=0;",
    "    END_CASE"
  ]);
});

test("indentLines indents CASE bodies after labels with inline comments", () => {
  const config = createConfig({ useTabs: false, indent: 4 });
  const indented = indentLines(
    [
      "CASE cycleCounter OF",
      "1: // Manual Mode Examples",
      "autoModeEnabled := FALSE;",
      "2: // Auto Mode",
      "emergencyStop := TRUE;",
      "END_CASE"
    ],
    config
  );

  assert.deepEqual(indented, [
    "CASE cycleCounter OF",
    "",
    "    1: // Manual Mode Examples",
    "        autoModeEnabled := FALSE;",
    "",
    "    2: // Auto Mode",
    "        emergencyStop := TRUE;",
    "    END_CASE"
  ]);
});

test("indentLines preserves already-expanded multiline function calls", () => {
  const config = createConfig({ useTabs: false, indent: 4, multilineIndent: 4 });
  const indented = indentLines(
    ["Timer(", "IN := NOT Timer.Q,", "PT := tSampleTime", ");"],
    config
  );

  assert.deepEqual(indented, [
    "Timer(",
    "    IN := NOT Timer.Q,",
    "    PT := tSampleTime",
    ");"
  ]);
});

test("normalizeParenthesesSpacing and formatText handle CDATA content", () => {
  assert.equal(normalizeParenthesesSpacing("Call( a,b )"), "Call(a, b)");

  const config = createConfig({ useTabs: false, indent: 4 });
  const formatted = formatText(
    "<Declaration><![CDATA[\n\nVAR\nx:INT;\nEND_VAR\n\n]]></Declaration>",
    config
  );

  assert.equal(
    formatted,
    "<Declaration><![CDATA[VAR\n    x : INT;\nEND_VAR\n]]></Declaration>"
  );
});
