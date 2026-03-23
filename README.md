# TcTidier

TcTidier is a formatter for TwinCAT Structured Text in VS Code.

It formats common TwinCAT PLC source files, plain Structured Text files, and TwinCAT-oriented virtual documents so you can keep TwinCAT code readable and consistent without hand-tuning spacing and indentation.

## What It Formats

- `.TcPOU`
- `.TcGVL`
- `.TcDUT`
- `.TcIO`
- `.st`
- `.iecst`
- `TcView` virtual Structured Text documents opened as `twincat` / `iec-st`

## Features

- Format the active TwinCAT / Structured Text document
- Format an entire workspace of supported TwinCAT files
- Use it from `Format Document`, the command palette, the editor toolbar, or the status bar
- Set it as the default formatter for TwinCAT Structured Text
- Configure formatting through a workspace `.tctidier.json`
- Respect ignore directives with `tctidier-ignore`, `tctidier-ignore-start`, and `tctidier-ignore-end`

## Quick Start

Install the extension, open a supported file, and either run `Format Document` or set TcTidier as the default formatter.

Recommended VS Code settings:

```json
{
  "[twincat-st]": {
    "editor.defaultFormatter": "CodePiercerTechnologies.tctidier",
    "editor.formatOnSave": true
  }
}
```

If another extension opens TwinCAT Structured Text as `iec-st`, TcTidier can still format it.

## Commands

- `TcTidier: Format Current Document`
- `TcTidier: Format Workspace TwinCAT Files`

## Configuration

Create a `.tctidier.json` file in your workspace root when you want to customize formatting behavior.

Example:

```json
{
  "indent": 4,
  "useTabs": true,
  "alignDeclarations": true,
  "alignAssignments": true,
  "alignNamedParameters": true,
  "blankLineBetweenCaseBranches": true,
  "normalizeOneLineIf": true,
  "printWidth": 100
}
```

For the fuller option set and behavior notes, see the formatter guide below.

## Notes

- Workspace formatting skips dirty files so unsaved work is not overwritten.
- TcTidier is designed for deterministic formatting rather than style-by-style presets.

## More Docs

- [Formatter Guide](docs/FORMATTER_GUIDE.md)
- [Project Quickstart](docs/QUICKSTART.md)
- [Contributing](docs/CONTRIBUTING.md)
- [GitFlow](docs/GITFLOW.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
