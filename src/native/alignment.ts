import type { Config } from "./types";
import { isVarEnd, isVarKeyword } from "./helpers";

const DECLARATION_PATTERN = /^(\s*)(\w+)\s*:(?!=)\s*([^;]+);(\s*\/\/.*)?\s*$/;
const ENUM_MEMBER_PATTERN = /^(\s*)(\w+)\s*:=\s*([^,]+)(,?)(\s*\/\/.*)?\s*$/;
const VAR_LINE_PATTERN = /^\s*(\w+)\s*:\s*([^;]+);(\s*\/\/.*)?\s*$/;
const ASSIGNMENT_PATTERN = /^(\s*)([\w.\[\]\^()]+)\s*:=\s*(.*;)(\s*\/\/.*)?$/;

export function alignDeclarations(lines: string[], config: Config): string[] {
  const output: string[] = [];
  let declarationBlock: Array<[string, string, string | undefined]> = [];
  let enumBlock: Array<[string, string, string, string | undefined]> = [];

  const flushDeclarations = (): void => {
    if (declarationBlock.length === 0) {
      return;
    }

    if (config.sortDeclarations) {
      declarationBlock = [...declarationBlock].sort((left, right) =>
        left[0].localeCompare(right[0])
      );
    }

    const maxLength = Math.max(...declarationBlock.map(([name]) => name.length));
    for (const [name, type, comment] of declarationBlock) {
      output.push(
        `${config.indentStr}${name.padEnd(maxLength)} : ${type.trim()};${comment || ""}`
      );
    }
    declarationBlock = [];
  };

  const flushEnums = (): void => {
    if (enumBlock.length === 0) {
      return;
    }

    const maxLength = Math.max(...enumBlock.map(([name]) => name.length));
    for (const [name, value, comma, comment] of enumBlock) {
      output.push(
        `${config.indentStr}${name.padEnd(maxLength)} := ${value.trim()}${comma}${comment || ""}`
      );
    }
    enumBlock = [];
  };

  const flush = (): void => {
    flushDeclarations();
    flushEnums();
  };

  for (const line of lines) {
    const declarationMatch = DECLARATION_PATTERN.exec(line);
    if (declarationMatch) {
      flushEnums();
      declarationBlock.push([
        declarationMatch[2],
        declarationMatch[3],
        declarationMatch[4]
      ]);
      continue;
    }

    const enumMatch = ENUM_MEMBER_PATTERN.exec(line);
    if (enumMatch) {
      flushDeclarations();
      enumBlock.push([
        enumMatch[2],
        enumMatch[3],
        enumMatch[4],
        enumMatch[5]
      ]);
      continue;
    }

    flush();
    output.push(line.replace(/\s+$/g, ""));
  }

  flush();
  return output;
}

export function alignVarsGlobally(lines: string[], config: Config): string[] {
  if (!config.alignVarColumns) {
    return lines;
  }

  const declarations: string[] = [];
  let inVarBlock = false;

  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (isVarKeyword(upper)) {
      inVarBlock = true;
      continue;
    }
    if (isVarEnd(upper)) {
      inVarBlock = false;
      continue;
    }
    if (!inVarBlock) {
      continue;
    }

    const match = VAR_LINE_PATTERN.exec(line);
    if (match) {
      declarations.push(match[1]);
    }
  }

  if (declarations.length === 0) {
    return lines;
  }

  const maxLength = Math.max(...declarations.map((name) => name.length));
  const output: string[] = [];
  inVarBlock = false;

  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (isVarKeyword(upper)) {
      inVarBlock = true;
      output.push(line.trim());
      continue;
    }
    if (isVarEnd(upper)) {
      inVarBlock = false;
      output.push("END_VAR");
      continue;
    }

    if (inVarBlock) {
      const match = VAR_LINE_PATTERN.exec(line);
      if (match) {
        const [, name, type, comment] = match;
        output.push(
          `${config.indentStr}${name}${" ".repeat(maxLength - name.length)} : ${type.trim()};${comment || ""}`
        );
        continue;
      }
    }

    output.push(line);
  }

  return output;
}

export function alignAssignments(lines: string[], config: Config): string[] {
  if (!config.alignAssignments) {
    return lines;
  }

  return lines.map((line) => {
    const match = ASSIGNMENT_PATTERN.exec(line);
    if (!match) {
      return line;
    }
    return `${match[1]}${match[2]} := ${match[3]}${match[4] || ""}`;
  });
}
