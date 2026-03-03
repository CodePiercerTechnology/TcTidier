import type { Config } from "./types";
import { cleanLine, isVarEnd, isVarKeyword } from "./helpers";

const ONE_LINE_IF_PATTERN = /^\s*IF\s+(.*?)\s+THEN\s+([^;]+);\s*END_IF\s*$/i;
const END_FOR_PATTERN = /^\s*END_FOR\s*$/i;
const END_IF_PATTERN = /^\s*END_IF\s*$/i;
const TYPE_START_PATTERN = /^\s*TYPE\b/i;
const END_TYPE_PATTERN = /^\s*END_TYPE\s*;?\s*$/i;
const STRUCT_START_PATTERN = /^\s*STRUCT\s*$/i;
const END_STRUCT_PATTERN = /^\s*END_STRUCT\s*;?\s*$/i;
const ENUM_OPEN_PATTERN = /^\s*\(\s*$/;
const ENUM_CLOSE_PATTERN = /^\s*\)\s*;?\s*$/;
const FUNCTION_PATTERN = /^\s*FUNCTION\s/;
const METHOD_PATTERN = /^\s*METHOD\b/i;
const PROGRAM_PATTERN = /^\s*PROGRAM\b/i;
const ACTION_PATTERN = /^\s*ACTION\b/i;
const PROPERTY_PATTERN = /^\s*PROPERTY\b/i;
const END_FUNCTION_PATTERN = /^\s*END_(FUNCTION_BLOCK|FUNCTION)\s*$/i;
const CASE_START_PATTERN = /^\s*CASE\s+/i;
const OF_PATTERN = /\bOF\b/i;
const END_CASE_PATTERN = /^\s*END_CASE\s*$/i;
const CASE_LABEL_PATTERN = /^[\w.]+\s*:\s*$/;
const ELSE_PATTERN = /^\s*ELSE\s*$/i;
const ELSIF_PATTERN = /^\s*ELSIF\b/i;
const MULTILINE_CALL_OPEN_PATTERN =
  /^(?:[\w.]+\(|[\w.[\]^]+\s*:=\s*[\w.]+\()\s*$/;
const MULTILINE_CALL_CLOSE_PATTERN = /^\)\s*;?\s*$/;
const BLOCK_OPENER_PATTERNS = [
  /\bIF\b/,
  /\bFOR\b/,
  /\bWHILE\b/,
  /\bREPEAT\b/,
  /\bCASE\b/
];

export function indentLines(lines: string[], config: Config): string[] {
  const output: string[] = [];
  let indentLevel = 0;
  const inMultilineComment = { active: false };
  const caseStack: number[] = [];
  const callStack: string[] = [];
  const enumStack: number[] = [];
  let pendingTypeHeader = false;

  let index = 0;
  while (index < lines.length) {
    const raw = lines[index].replace(/\s+$/g, "");
    const stripped = raw.trim();

    if (!stripped) {
      output.push("");
      index += 1;
      continue;
    }

    if (callStack.length > 0) {
      const callIndent = callStack[callStack.length - 1];
      if (MULTILINE_CALL_CLOSE_PATTERN.test(stripped)) {
        output.push(`${callIndent}${stripped}`);
        callStack.pop();
      } else {
        output.push(`${callIndent}${" ".repeat(config.multilineIndent)}${stripped}`);
      }
      index += 1;
      continue;
    }

    if (config.normalizeOneLineIf) {
      const match = ONE_LINE_IF_PATTERN.exec(raw);
      if (match) {
        lines.splice(
          index,
          1,
          `IF ${match[1].trim()} THEN`,
          `${config.indentStr}${match[2].trim()};`,
          "END_IF"
        );
        continue;
      }
    }

    const cleaned = cleanLine(raw, inMultilineComment);
    const upper = cleaned.toUpperCase();

    if (END_FOR_PATTERN.test(upper)) {
      indentLevel = Math.max(indentLevel - 1, 0);
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      index += 1;
      continue;
    }

    if (END_IF_PATTERN.test(upper)) {
      indentLevel = Math.max(indentLevel - 1, 0);
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      index += 1;
      continue;
    }

    if (END_STRUCT_PATTERN.test(upper)) {
      indentLevel = Math.max(indentLevel - 1, 0);
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      pendingTypeHeader = false;
      index += 1;
      continue;
    }

    if (END_TYPE_PATTERN.test(upper)) {
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      pendingTypeHeader = false;
      index += 1;
      continue;
    }

    if (enumStack.length > 0 && ENUM_CLOSE_PATTERN.test(stripped)) {
      indentLevel = Math.max(indentLevel - 1, 0);
      enumStack.pop();
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      pendingTypeHeader = false;
      index += 1;
      continue;
    }

    if (
      isVarKeyword(upper) ||
      METHOD_PATTERN.test(upper) ||
      PROGRAM_PATTERN.test(upper) ||
      ACTION_PATTERN.test(upper) ||
      PROPERTY_PATTERN.test(upper) ||
      upper.includes("FUNCTION_BLOCK") ||
      FUNCTION_PATTERN.test(upper)
    ) {
      indentLevel = 0;
      caseStack.length = 0;
      pendingTypeHeader = false;
      output.push(stripped);
      index += 1;
      continue;
    }

    if (TYPE_START_PATTERN.test(upper)) {
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      pendingTypeHeader = true;
      index += 1;
      continue;
    }

    if (STRUCT_START_PATTERN.test(upper)) {
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      indentLevel += 1;
      pendingTypeHeader = false;
      index += 1;
      continue;
    }

    if (pendingTypeHeader && ENUM_OPEN_PATTERN.test(stripped)) {
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      indentLevel += 1;
      enumStack.push(indentLevel);
      pendingTypeHeader = false;
      index += 1;
      continue;
    }

    if (isVarEnd(upper)) {
      indentLevel = 0;
      caseStack.length = 0;
      output.push("END_VAR");
      index += 1;
      continue;
    }

    if (END_FUNCTION_PATTERN.test(upper)) {
      indentLevel = 0;
      caseStack.length = 0;
      output.push(stripped);
      index += 1;
      continue;
    }

    if (CASE_START_PATTERN.test(upper) && OF_PATTERN.test(upper)) {
      caseStack.push(indentLevel);
      output.push(`${config.indentStr.repeat(indentLevel)}${stripped}`);
      indentLevel += 1;
      index += 1;
      continue;
    }

    if (END_CASE_PATTERN.test(upper)) {
      const baseIndent = caseStack.pop() ?? Math.max(indentLevel - 1, 0);
      indentLevel = baseIndent;
      output.push(`${config.indentStr.repeat(baseIndent)}${stripped}`);
      index += 1;
      continue;
    }

    if (caseStack.length > 0 && CASE_LABEL_PATTERN.test(cleaned)) {
      const baseIndent = caseStack[caseStack.length - 1];
      if (
        config.blankLineBetweenCaseBranches &&
        output.length > 0 &&
        output[output.length - 1].trim()
      ) {
        output.push("");
      }
      output.push(`${config.indentStr.repeat(baseIndent + 1)}${stripped}`);
      indentLevel = baseIndent + 2;
      index += 1;
      continue;
    }

    if (caseStack.length > 0 && ELSE_PATTERN.test(upper)) {
      const baseIndent = caseStack[caseStack.length - 1];
      output.push(`${config.indentStr.repeat(baseIndent + 1)}${stripped}`);
      indentLevel = baseIndent + 2;
      index += 1;
      continue;
    }

    const isElsif = caseStack.length === 0 && ELSIF_PATTERN.test(upper);
    if (isElsif) {
      indentLevel = Math.max(indentLevel - 1, 0);
    }

    const isElse = caseStack.length === 0 && ELSE_PATTERN.test(upper);
    if (isElse) {
      indentLevel = Math.max(indentLevel - 1, 0);
    }

    const isOpener = !isElsif
      ? BLOCK_OPENER_PATTERNS.some((pattern) => pattern.test(upper))
      : false;

    const lineIndent = config.indentStr.repeat(indentLevel);
    output.push(`${lineIndent}${stripped}`);

    if (!STRUCT_START_PATTERN.test(upper) && !ENUM_OPEN_PATTERN.test(stripped)) {
      pendingTypeHeader = false;
    }

    if (MULTILINE_CALL_OPEN_PATTERN.test(stripped)) {
      callStack.push(lineIndent);
    }

    if (isOpener && !stripped.endsWith(":")) {
      indentLevel += 1;
    }

    if (isElsif || isElse) {
      indentLevel += 1;
    }

    index += 1;
  }

  return output;
}
