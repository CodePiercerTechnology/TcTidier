import { splitArguments } from "./helpers";
import type { Config } from "./types";

interface ExpressionResult {
  lines: string[];
  nextIndex: number;
}

interface TokenizedExpression {
  operands: string[];
  operators: string[];
}

function isNamedParameterCall(code: string): boolean {
  return /\b\w+\s*:=\s*/.test(code);
}

function extractNamedParams(argumentString: string): Array<[string, string]> {
  const params: Array<[string, string]> = [];
  for (const argument of splitArguments(argumentString)) {
    const match = /^(\w+)\s*:=\s*(.+)$/.exec(argument.trim());
    if (match) {
      params.push([match[1], match[2]]);
    }
  }
  return params;
}

export function formatLongExpression(
  lines: string[],
  index: number,
  config: Config
): ExpressionResult {
  const line = lines[index];
  const indent = line.length - line.trimStart().length;
  const stripped = line.trimStart();

  const assignmentMatch = /^([\w.\[\]\^]+)\s*:=\s*(.*)$/.exec(stripped);
  const functionMatch = /^([\w.]+)\((.*)\)(\s*;.*)?$/.exec(stripped);

  if (!assignmentMatch && !functionMatch) {
    const ifMatch = /^IF\s+(.+?)\s+THEN\s*$/i.exec(stripped);
    if (!ifMatch) {
      return { lines: [line], nextIndex: index + 1 };
    }

    const condition = ifMatch[1];
    if (line.length <= config.maxLineLength) {
      return { lines: [line], nextIndex: index + 1 };
    }

    if (/\sAND\s|\sOR\s/i.test(condition)) {
      const result = formatIfBooleanCondition(condition, indent, config);
      if (result.length > 0) {
        return { lines: result, nextIndex: index + 1 };
      }
    }

    if (/[<>]=?|=<>/.test(condition)) {
      const result = formatIfComparisonCondition(condition, indent, config);
      if (result.length > 0) {
        return { lines: result, nextIndex: index + 1 };
      }
    }

    return { lines: [line], nextIndex: index + 1 };
  }

  if (functionMatch && !assignmentMatch) {
    const functionName = functionMatch[1];
    const argumentString = functionMatch[2];
    const hasSemicolon = functionMatch[3] !== undefined;

    if (argumentString.trim() === "") {
      return { lines: [line], nextIndex: index + 1 };
    }

    const fullLine = `${functionName}(${argumentString})`;
    const args = splitArguments(argumentString);
    const hasMultipleArgs = args.length > 1;
    const needsFormatting = hasMultipleArgs || indent + fullLine.length > config.maxLineLength;

    if (!needsFormatting || args.length === 0 || (args.length === 1 && args[0] === "")) {
      return { lines: [line], nextIndex: index + 1 };
    }

    if (config.alignNamedParameters && isNamedParameterCall(argumentString)) {
      const params = extractNamedParams(argumentString);
      if (params.length > 0) {
        const maxNameLength = Math.max(...params.map(([name]) => name.length));
        const result = [`${" ".repeat(indent)}${functionName}(`];
        for (const [paramIndex, [name, value]] of params.entries()) {
          const comma = paramIndex < params.length - 1 ? "," : "";
          result.push(
            `${" ".repeat(indent + config.multilineIndent)}${name.padEnd(maxNameLength)} := ${value}${comma}`
          );
        }
        result.push(`${" ".repeat(indent)});`);
        return { lines: result, nextIndex: index + 1 };
      }
    }

    const formatted = [`${" ".repeat(indent)}${functionName}(`];
    const argumentIndent = " ".repeat(indent + config.multilineIndent);
    for (const [argIndex, arg] of args.entries()) {
      const comma = argIndex < args.length - 1 ? "," : "";
      formatted.push(`${argumentIndent}${arg}${comma}`);
    }
    formatted.push(`${" ".repeat(indent)}${hasSemicolon ? ");" : ")"}`);
    return { lines: formatted, nextIndex: index + 1 };
  }

  if (assignmentMatch) {
    const left = assignmentMatch[1];
    const right = assignmentMatch[2];
    const totalLength = indent + left.length + 3 + right.length;

    if (totalLength <= config.maxLineLength) {
      return { lines: [line], nextIndex: index + 1 };
    }

    const nestedFunctionMatch = /(\w+\()(.+?)(\))/.exec(right);
    if (nestedFunctionMatch) {
      const [, functionStart, argumentString, closingParen] = nestedFunctionMatch;
      const args = splitArguments(argumentString);
      if (args.length > 0 && !(args.length === 1 && args[0] === "")) {
        const result = [`${" ".repeat(indent)}${left} := ${functionStart}`];
        const argumentIndent = " ".repeat(indent + config.multilineIndent);
        for (const [argIndex, arg] of args.entries()) {
          const comma = argIndex < args.length - 1 ? "," : "";
          result.push(`${argumentIndent}${arg}${comma}`);
        }
        result.push(`${" ".repeat(indent)}${closingParen};`);
        return { lines: result, nextIndex: index + 1 };
      }
    }

    if (/[+\-*/]/.test(right)) {
      const arithmetic = formatArithmeticExpression(left, right, indent, config);
      if (arithmetic.length > 0) {
        return { lines: arithmetic, nextIndex: index + 1 };
      }
    }

    const andCount = (right.toUpperCase().match(/\sAND\s/g) || []).length;
    const orCount = (right.toUpperCase().match(/\sOR\s/g) || []).length;
    if ((/\sAND\s|\sOR\s/i.test(right)) && andCount + orCount >= 2) {
      const booleanExpression = formatBooleanExpression(left, right, indent, config);
      if (booleanExpression.length > 0) {
        return { lines: booleanExpression, nextIndex: index + 1 };
      }
    }

    if (/[<>]=?|=<>/.test(right)) {
      const comparison = formatComparisonExpression(left, right, indent, config);
      if (comparison.length > 0) {
        return { lines: comparison, nextIndex: index + 1 };
      }
    }
  }

  return { lines: [line], nextIndex: index + 1 };
}

function formatArithmeticExpression(
  left: string,
  right: string,
  baseIndent: number,
  config: Config
): string[] {
  const parts = right.split(/(\s*[+\-*/]\s*)/);
  const operands: string[] = [];
  const operators: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    if (["+", "-", "*", "/"].includes(trimmed)) {
      operators.push(trimmed);
    } else {
      operands.push(trimmed);
    }
  }

  if (operands.length <= 1) {
    return [];
  }

  const continuationIndent = " ".repeat(baseIndent + config.multilineIndent);
  const result = [
    `${" ".repeat(baseIndent)}${left} :=`,
    `${continuationIndent}${operands[0]}`
  ];

  for (let operandIndex = 1; operandIndex < operands.length; operandIndex += 1) {
    if (operandIndex <= operators.length) {
      result.push(
        `${continuationIndent}${operators[operandIndex - 1]} ${operands[operandIndex]}`
      );
    } else {
      result.push(`${continuationIndent}${operands[operandIndex]};`);
    }
  }

  if (!result[result.length - 1].endsWith(";")) {
    result[result.length - 1] += ";";
  }

  return result;
}

function formatBooleanExpression(
  left: string,
  right: string,
  baseIndent: number,
  config: Config
): string[] {
  return formatOperatorLedExpression(
    left,
    right,
    baseIndent,
    config,
    /(\s+(?:AND|OR)\s+)/i,
    ["AND", "OR"],
    ";"
  );
}

function formatComparisonExpression(
  left: string,
  right: string,
  baseIndent: number,
  config: Config
): string[] {
  return formatOperatorLedExpression(
    left,
    right,
    baseIndent,
    config,
    /(\s*(?:<>|<=|>=|<|>|=)\s*)/i,
    null,
    ";"
  );
}

function formatIfBooleanCondition(
  condition: string,
  baseIndent: number,
  config: Config
): string[] {
  return formatIfOperatorLedExpression(
    condition,
    baseIndent,
    config,
    /(\s+(?:AND|OR)\s+)/i,
    ["AND", "OR"]
  );
}

function formatIfComparisonCondition(
  condition: string,
  baseIndent: number,
  config: Config
): string[] {
  return formatIfOperatorLedExpression(
    condition,
    baseIndent,
    config,
    /(\s*(?:<>|<=|>=|<|>|=)\s*)/i,
    null
  );
}

function formatOperatorLedExpression(
  left: string,
  right: string,
  baseIndent: number,
  config: Config,
  splitPattern: RegExp,
  keywordOperators: string[] | null,
  lineTerminator: string
): string[] {
  const tokens = tokenizeExpression(right, splitPattern, keywordOperators);
  if (tokens.operands.length <= 1) {
    return [];
  }

  const continuationIndent = " ".repeat(baseIndent + config.multilineIndent);
  const result = [
    `${" ".repeat(baseIndent)}${left} :=`,
    `${continuationIndent}${tokens.operands[0]}`
  ];

  for (let operandIndex = 1; operandIndex < tokens.operands.length; operandIndex += 1) {
    const operator = tokens.operators[operandIndex - 1];
    const suffix = operandIndex === tokens.operands.length - 1 ? lineTerminator : "";
    result.push(`${continuationIndent}${operator} ${tokens.operands[operandIndex]}${suffix}`);
  }

  if (!result[result.length - 1].endsWith(lineTerminator)) {
    result[result.length - 1] += lineTerminator;
  }

  return result;
}

function formatIfOperatorLedExpression(
  condition: string,
  baseIndent: number,
  config: Config,
  splitPattern: RegExp,
  keywordOperators: string[] | null
): string[] {
  const tokens = tokenizeExpression(condition, splitPattern, keywordOperators);
  if (tokens.operands.length <= 1) {
    return [];
  }

  const continuationIndent = " ".repeat(baseIndent + config.multilineIndent);
  const result = [`${" ".repeat(baseIndent)}IF ${tokens.operands[0]}`];

  for (let operandIndex = 1; operandIndex < tokens.operands.length; operandIndex += 1) {
    const operator = tokens.operators[operandIndex - 1];
    const suffix = operandIndex === tokens.operands.length - 1 ? " THEN" : "";
    result.push(`${continuationIndent}${operator} ${tokens.operands[operandIndex]}${suffix}`);
  }

  if (!result[result.length - 1].trimEnd().endsWith("THEN")) {
    result[result.length - 1] = `${result[result.length - 1].replace(/;+\s*$/, "").trimEnd()} THEN`;
  }

  return result;
}

function tokenizeExpression(
  value: string,
  splitPattern: RegExp,
  keywordOperators: string[] | null
): TokenizedExpression {
  const rawParts = value.split(splitPattern);
  const operands: string[] = [];
  const operators: string[] = [];

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    if (keywordOperators) {
      if (keywordOperators.includes(trimmed.toUpperCase())) {
        operators.push(trimmed.toUpperCase());
      } else {
        operands.push(trimmed);
      }
      continue;
    }

    if (/^(<>|<=|>=|<|>|=)$/.test(trimmed)) {
      operators.push(trimmed);
    } else {
      operands.push(trimmed);
    }
  }

  return { operands, operators };
}
