import { VAR_BLOCK_KEYWORDS } from "./constants";

export function isVarKeyword(line: string): boolean {
  return VAR_BLOCK_KEYWORDS.has(line.trim().toUpperCase());
}

export function isVarEnd(line: string): boolean {
  return line.trim().toUpperCase() === "END_VAR";
}

export function cleanLine(
  line: string,
  inMultilineComment: { active: boolean }
): string {
  if (inMultilineComment.active) {
    if (line.includes("*)")) {
      inMultilineComment.active = false;
      return line.split("*)", 2)[1] || "";
    }
    return "";
  }

  if (line.includes("(*")) {
    inMultilineComment.active = true;
    line = line.split("(*", 2)[0] || "";
  }

  return line.replace(/'([^']|'')*'/g, "''").split("//", 2)[0].trim();
}

export function splitArguments(argumentString: string): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of argumentString) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    } else if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}
