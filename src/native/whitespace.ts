export function normalizeBlankLines(lines: string[]): string[] {
  const output: string[] = [];
  let previousWasBlank = false;

  for (const line of lines) {
    if (!line.trim()) {
      if (!previousWasBlank) {
        output.push("");
      }
      previousWasBlank = true;
      continue;
    }

    previousWasBlank = false;
    output.push(line);
  }

  return output;
}

export function fixDoubleSemicolons(lines: string[]): string[] {
  return lines.map((line) => line.replace(/;;/g, ";"));
}
