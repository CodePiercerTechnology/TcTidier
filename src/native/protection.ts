export class StringProtector {
  private counter = 0;
  private readonly strings = new Map<string, string>();
  private readonly restoredStrings = new Map<string, string>();

  clear(): void {
    this.counter = 0;
    this.strings.clear();
    this.restoredStrings.clear();
  }

  protect(code: string): string {
    return code.replace(/'((?:[^']|'')*?)'/g, (_match, inner: string) => {
      this.counter += 1;
      const placeholder = `__STRING_${this.counter}__`;
      const original = inner.replace(/''/g, "'");
      this.strings.set(placeholder, original);
      this.restoredStrings.set(placeholder, `'${original.replace(/'/g, "''")}'`);
      return placeholder;
    });
  }

  restore(code: string): string {
    if (this.restoredStrings.size === 0) {
      return code;
    }

    return code.replace(/__STRING_\d+__/g, (placeholder) => {
      return this.restoredStrings.get(placeholder) || placeholder;
    });
  }
}

export function extractIgnoreLines(
  lines: string[],
  respectIgnore: boolean
): Set<number> {
  if (!respectIgnore) {
    return new Set<number>();
  }

  const ignored = new Set<number>();
  let blockStart: number | null = null;

  for (const [index, line] of lines.entries()) {
    const stripped = line.trim();
    if (stripped.includes("tctidier-ignore-start")) {
      blockStart = index;
      continue;
    }

    if (stripped.includes("tctidier-ignore-end")) {
      if (blockStart !== null) {
        for (let lineNumber = blockStart; lineNumber <= index; lineNumber += 1) {
          ignored.add(lineNumber);
        }
      }
      blockStart = null;
      continue;
    }

    if (
      stripped.includes("tctidier-ignore") &&
      !stripped.includes("tctidier-ignore-start") &&
      !stripped.includes("tctidier-ignore-end")
    ) {
      ignored.add(index);
    }
  }

  return ignored;
}

export function normalizeParenthesesSpacing(line: string): string {
  return line
    .replace(/\(\s+/g, "(")
    .replace(/([^\s])\s+\)/g, "$1)")
    .replace(/,([^ ])/g, ", $1");
}
