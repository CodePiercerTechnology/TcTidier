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

const XML_ST_NODE_PATTERN =
  /<(Declaration|Implementation)([^>]*)>([\s\S]*?)<\/\1>/gi;
const TYPE_START_PATTERN = /^\s*TYPE\b/i;
const END_TYPE_PATTERN = /^\s*END_TYPE\s*;?\s*$/i;
const STRUCT_START_PATTERN = /^\s*STRUCT\s*$/i;
const END_STRUCT_PATTERN = /^\s*END_STRUCT\s*;?\s*$/i;

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

function decodeXmlText(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_match, decimal: string) =>
      String.fromCodePoint(parseInt(decimal, 10))
    )
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function repairTypeClosers(lines: string[]): string[] {
  const repaired: string[] = [];
  let typeDepth = 0;
  let structDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (TYPE_START_PATTERN.test(trimmed)) {
      typeDepth += 1;
      repaired.push(line);
      continue;
    }

    if (STRUCT_START_PATTERN.test(trimmed)) {
      structDepth += 1;
      repaired.push(line);
      continue;
    }

    if (END_STRUCT_PATTERN.test(trimmed)) {
      structDepth = Math.max(structDepth - 1, 0);
      repaired.push(line);
      continue;
    }

    if (END_TYPE_PATTERN.test(trimmed)) {
      if (structDepth > 0) {
        // Recover from partially-corrupted DUT text where END_TYPE leaked
        // into an inner struct body before the surrounding END_STRUCT.
        continue;
      }

      typeDepth = Math.max(typeDepth - 1, 0);
      repaired.push(line);
      continue;
    }

    repaired.push(line);
  }

  return repaired;
}

function decodeEntityPollutedPlainTextLines(text: string): string[] {
  const rawLines = splitLinesLikePython(text);
  const decodedLines: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (
      trimmed === "&#xD;" ||
      trimmed === "&#13;" ||
      trimmed === "&#xD;\r" ||
      trimmed === "&#13;\r"
    ) {
      continue;
    }

    const decoded = decodeXmlText(rawLine).replace(/\r/g, "");
    decodedLines.push(decoded);
  }

  return decodedLines;
}

function formatXmlEncodedStContent(content: string, config: Config): string {
  const decoded = decodeXmlText(content).replace(/\r\n?/g, "\n");
  const lines = repairTypeClosers(splitLinesLikePython(decoded));

  let start = 0;
  let end = lines.length;

  while (start < end && !lines[start].trim()) {
    start += 1;
  }
  while (end > start && !lines[end - 1].trim()) {
    end -= 1;
  }

  const formatted = formatSt(lines.slice(start, end).join("\n"), config);
  return encodeXmlText(formatted);
}

function tryFormatEntityPollutedPlainText(text: string, config: Config): string | null {
  if (!/&#xD;|&#13;|&lt;|&gt;|&amp;/.test(text)) {
    return null;
  }

  if (/^\s*<\?xml\b/i.test(text) || /^\s*<[\w:-]+/i.test(text)) {
    return null;
  }

  const repaired = repairTypeClosers(decodeEntityPollutedPlainTextLines(text)).join("\n");
  return formatSt(repaired, config);
}

function tryFormatTwinCatXml(text: string, config: Config): string | null {
  const looksLikeXml = /^\s*<\?xml\b/i.test(text) || /^\s*<[\w:-]+/i.test(text);
  if (!looksLikeXml) {
    return null;
  }

  let replaced = false;
  let output = text.replace(/<!\[CDATA\[(.*?)\]\]>/gs, (_match, content: string) => {
    replaced = true;
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

  output = output.replace(
    XML_ST_NODE_PATTERN,
    (match, tagName: string, attributes: string, content: string) => {
      if (content.includes("<![CDATA[")) {
        return match;
      }
      if (content.includes("<")) {
        return match;
      }

      replaced = true;
      return `<${tagName}${attributes}>${formatXmlEncodedStContent(content, config)}</${tagName}>`;
    }
  );

  if (replaced) {
    return output;
  }

  return text;
}

export function formatText(text: string, config: Config): string {
  const xmlFormatted = tryFormatTwinCatXml(text, config);
  if (xmlFormatted !== null) {
    return xmlFormatted;
  }

  const recoveredPlainText = tryFormatEntityPollutedPlainText(text, config);
  if (recoveredPlainText !== null) {
    return recoveredPlainText;
  }

  return formatSt(text, config);
}

export function formatDocumentText(text: string, options: FormatOptions = {}): string {
  const config = options.config || loadConfig(options);
  return formatText(text, config);
}
