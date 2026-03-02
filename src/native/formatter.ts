import { loadConfig } from "./config";
import { alignAssignments, alignDeclarations, alignVarsGlobally } from "./alignment";
import { formatLongExpression } from "./expressions";
import { indentLines } from "./indentation";
import {
  StringProtector,
  extractIgnoreLines,
  normalizeParenthesesSpacing
} from "./protection";
import { fixDoubleSemicolons, normalizeBlankLines } from "./whitespace";
import type { Config, FormatOptions } from "./types";

function splitLinesLikePython(text: string): string[] {
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

export function formatSt(code: string, config: Config): string {
  const stringProtector = new StringProtector();
  const lines = splitLinesLikePython(code);
  const ignoreLines = extractIgnoreLines(lines, config.respectIgnore);
  const originalLines = ignoreLines.size > 0 ? lines.slice() : null;

  let workingLines = lines;

  if (config.balanceParentheses) {
    stringProtector.clear();
    workingLines = workingLines.map((line) => stringProtector.protect(line));
  }

  if (config.alignDeclarations) {
    workingLines = alignDeclarations(workingLines, config);
  }

  workingLines = indentLines(workingLines, config);
  workingLines = alignVarsGlobally(workingLines, config);
  workingLines = alignAssignments(workingLines, config);

  const formatted: string[] = [];
  let index = 0;

  while (index < workingLines.length) {
    if (ignoreLines.has(index)) {
      formatted.push(originalLines?.[index] ?? workingLines[index]);
      index += 1;
      continue;
    }

    const result = formatLongExpression(workingLines, index, config);
    formatted.push(...result.lines);
    index = result.nextIndex;
  }

  let output = formatted;

  if (config.balanceParentheses) {
    output = output.map((line) => normalizeParenthesesSpacing(line));
    output = stringProtector.restore(output.join("\n")).split("\n");
  }

  output = fixDoubleSemicolons(output);

  if (config.normalizeBlankLines) {
    output = normalizeBlankLines(output);
  }

  if (!config.trailingWhitespace) {
    output = output.map((line) => line.replace(/\s+$/g, ""));
  }

  return output.join("\n");
}

export function formatText(text: string, config: Config): string {
  if (!text.includes("<![CDATA[") || !text.includes("]]>")) {
    return formatSt(text, config);
  }

  return text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, (_match, content: string) => {
    const contentLines = splitLinesLikePython(content);
    let start = 0;
    let end = contentLines.length;

    while (start < end && !contentLines[start].trim()) {
      start += 1;
    }
    while (end > start && !contentLines[end - 1].trim()) {
      end -= 1;
    }

    return `<![CDATA[${formatSt(contentLines.slice(start, end).join("\n"), config)}\n]]>`;
  });
}

export function formatDocumentText(text: string, options: FormatOptions = {}): string {
  const config = options.config || loadConfig(options);
  return formatText(text, config);
}
