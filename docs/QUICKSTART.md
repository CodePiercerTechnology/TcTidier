# Quickstart

This repo is a VS Code extension project. There is no longer a Python CLI or bundled virtualenv workflow.

## Local Setup

```bash
npm install
npm run build
```

The repo ships `.npmrc` for `C:/certs/zscaler.pem`, so `npm install` should work in your Zscaler environment.

## Debug The Extension

1. Open the repo in VS Code.
2. Press `F5`.
3. Select `Run TcTidier Extension`.
4. In the Extension Development Host, open a `.TcPOU`, `.TcGVL`, `.TcDUT`, `.TcIO`, `.st`, or `.iecst` file.
5. Trigger formatting from:
   - `Format Document`
   - `TcTidier: Format Current Document`
   - the editor toolbar button
   - the status bar button
   - `TcTidier: Format Workspace TwinCAT Files`

To keep rebuilding while you edit, use `Run TcTidier Extension (Watch)`.

## Package And Install Locally

```bash
vsce package
code --install-extension tctidier-0.1.0.vsix --force
```

## Recommended VS Code Settings

```json
{
  "[twincat-st]": {
    "editor.defaultFormatter": "CodePiercerTechnologies.tctidier",
    "editor.formatOnSave": true
  }
}
```

`editor.formatOnSave` only formats the file being saved. Workspace formatting is manual through the dedicated command.

## Validation

```bash
npm test
npm run bench
npm run bench:compare
npm run verify
```

## Repo Layout

```text
src/               Extension entrypoint and formatter modules
tests/fixtures/    Single committed formatter corpus
tests/*.test.js    Phase and fixture tests
benchmarks/        Performance smoke checks
docs/              Project documentation
```

## Next Reads

- [README](../README.md)
- [Formatter Guide](FORMATTER_GUIDE.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
