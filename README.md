# TcTidier

TcTidier is a VS Code extension and native TypeScript formatter for TwinCAT Structured Text.

It formats the active document, can format all supported TwinCAT files in a workspace, and keeps its regression corpus under `tests/fixtures` so the repo root stays clean.

## Features

- Full-document formatting for `.TcPOU`, `.TcGVL`, `.TcDUT`, `.TcIO`, `.st`, and `.iecst`
- Manual formatting from the command palette, editor toolbar, or status bar
- Workspace formatting command for bulk cleanup
- Config lookup via `.tctidier.json`
- Deterministic formatting with committed fixture, phase, and integration tests
- Benchmark smoke check to catch obvious performance regressions

## Repo Layout

```text
src/           Extension entrypoint and native formatter
tests/         Fixture corpus and focused phase tests
benchmarks/    Native formatter benchmark scripts and baseline
docs/          Quickstart, guide, and contribution notes
.vscode/       Launch/tasks for debugging the extension
```

## GitFlow

This repo now uses `main` for production history and `develop` for ongoing integration work. Create `feature/*` branches from `develop`, cut `release/*` branches when preparing a version, and use `hotfix/*` only for urgent fixes from `main`.

`npm run release:check` runs the full verification path and packages a local `.vsix` so release branches and tags are validated the same way in local work and CI.

## Install And Build

```bash
npm install
npm run build
```

If you are behind a corporate proxy or custom CA, configure npm on your machine or CI environment. Do not commit machine-specific npm certificate settings to this repo.

## Run In VS Code

1. Open the repo in VS Code.
2. Press `F5`.
3. Choose `Run TcTidier Extension` or `Run TcTidier Extension (Watch)`.
4. In the Extension Development Host, open a supported TwinCAT/ST file.
5. Run `Format Document`, `TcTidier: Format Current Document`, or `TcTidier: Format Workspace TwinCAT Files`.

Recommended VS Code settings:

```json
{
  "[twincat-st]": {
    "editor.defaultFormatter": "CodePiercerTechnologies.tctidier",
    "editor.formatOnSave": true
  }
}
```

## Package And Install Locally

```bash
npm run package:vsix
code --install-extension tctidier-0.1.1.vsix --force
```

After public publish, you can also install it directly with:

```bash
code --install-extension CodePiercerTechnologies.tctidier
```

## Commands

- `TcTidier: Format Current Document`
- `TcTidier: Format Workspace TwinCAT Files`

The current document command is also exposed through the editor toolbar and a status bar button when a supported file is active.

## Configuration

Create a `.tctidier.json` file in your workspace root:

```json
{
  "indent": 4,
  "useTabs": true,
  "alignDeclarations": true,
  "alignAssignments": true,
  "alignNamedParameters": true,
  "blankLineBetweenCaseBranches": true,
  "normalizeOneLineIf": true,
  "maxLineLength": 90,
  "printWidth": 100,
  "caseIndent": 4,
  "multilineIndent": 4
}
```

Default formatter options:

```json
{
  "indent": 4,
  "useTabs": true,
  "alignDeclarations": true,
  "alignAssignments": true,
  "sortDeclarations": false,
  "normalizeBlankLines": true,
  "alignVarColumns": true,
  "normalizeOneLineIf": true,
  "blankLineBetweenCaseBranches": true,
  "maxLineLength": 90,
  "keywordsUppercase": true,
  "verticalLogicalChains": true,
  "costBasedBreaking": true,
  "respectIgnore": true,
  "balanceParentheses": true,
  "alignNamedParameters": true,
  "trailingWhitespace": false,
  "printWidth": 100,
  "alignComments": true,
  "newlineBetweenMethods": true,
  "caseIndent": 4,
  "multilineIndent": 4
}
```

Ignore directives use `tctidier-ignore`, `tctidier-ignore-start`, and `tctidier-ignore-end`.

## Test And Verify

```bash
npm test
npm run bench
npm run bench:compare
npm run verify
```

`npm test` runs formatter-core tests plus VS Code integration tests. The integration runner uses a local VS Code install when available and falls back to `@vscode/test-electron` downloads otherwise.

## More Docs

- [Quickstart](docs/QUICKSTART.md)
- [Formatter Guide](docs/FORMATTER_GUIDE.md)
- [Contributing](docs/CONTRIBUTING.md)
- [GitFlow](docs/GITFLOW.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [`LICENSE`](LICENSE).
