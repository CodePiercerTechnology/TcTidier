import type { Config } from "./types";

export const VAR_BLOCK_KEYWORDS = new Set([
  "VAR",
  "VAR_INPUT",
  "VAR_OUTPUT",
  "VAR_IN_OUT",
  "VAR_TEMP",
  "VAR_STAT",
  "VAR_INST",
  "VAR_CONSTANT"
]);

export const DEFAULT_CONFIG: Omit<Config, "indentStr"> = {
  indent: 4,
  useTabs: true,
  alignDeclarations: true,
  alignAssignments: true,
  sortDeclarations: false,
  normalizeBlankLines: true,
  alignVarColumns: true,
  normalizeOneLineIf: true,
  blankLineBetweenCaseBranches: true,
  maxLineLength: 90,
  keywordsUppercase: true,
  verticalLogicalChains: true,
  costBasedBreaking: true,
  respectIgnore: true,
  balanceParentheses: true,
  alignNamedParameters: true,
  trailingWhitespace: false,
  printWidth: 100,
  alignComments: true,
  newlineBetweenMethods: true,
  caseIndent: 4,
  multilineIndent: 4
};
