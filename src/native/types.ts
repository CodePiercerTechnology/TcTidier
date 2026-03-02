export interface Config {
  indent: number;
  useTabs: boolean;
  alignDeclarations: boolean;
  alignAssignments: boolean;
  sortDeclarations: boolean;
  normalizeBlankLines: boolean;
  alignVarColumns: boolean;
  normalizeOneLineIf: boolean;
  blankLineBetweenCaseBranches: boolean;
  maxLineLength: number;
  keywordsUppercase: boolean;
  verticalLogicalChains: boolean;
  costBasedBreaking: boolean;
  respectIgnore: boolean;
  balanceParentheses: boolean;
  alignNamedParameters: boolean;
  trailingWhitespace: boolean;
  printWidth: number;
  alignComments: boolean;
  newlineBetweenMethods: boolean;
  caseIndent: number;
  multilineIndent: number;
  readonly indentStr: string;
}

export interface LoadConfigOptions {
  stdinFilepath?: string | null;
  workspaceRoot?: string | null;
  cwd?: string;
}

export interface FormatOptions extends LoadConfigOptions {
  config?: Config;
}
