import type { Config } from "./types";
import { isVarEnd, isVarKeyword } from "./helpers";

const DECLARATION_PATTERN = /^\s*(\w+)\s*:\s*([^;:=]+);\s*$/;
const VAR_LINE_PATTERN = /^\s*(\w+)\s*:\s*([^;]+);(\s*\/\/.*)?\s*$/;
const ASSIGNMENT_PATTERN = /^(\s*)([\w.\[\]\^()]+)\s*:=\s*(.*?)(\s*\/\/.*)?$/;

export function alignDeclarations(lines: string[], config: Config): string[] {
  const output: string[] = [];
  let block: Array<[string, string]> = [];

  const flush = (): void => {
    if (block.length === 0) {
      return;
    }

    if (config.sortDeclarations) {
      block = [...block].sort((left, right) => left[0].localeCompare(right[0]));
    }

    const maxLength = Math.max(...block.map(([name]) => name.length));
    for (const [name, type] of block) {
      output.push(`${config.indentStr}${name.padEnd(maxLength)} : ${type.trim()};`);
    }
    block = [];
  };

  for (const line of lines) {
    const match = DECLARATION_PATTERN.exec(line);
    if (match) {
      block.push([match[1], match[2]]);
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
