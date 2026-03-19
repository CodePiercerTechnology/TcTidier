# Changelog

## [Unreleased]

## [0.1.1] - 2026-03-04

### Changed

- Cleaned the repo layout so formatter fixtures live only under `tests/fixtures`.
- Moved secondary documentation into `docs/`.
- Removed stale Python-era artifacts, including the old formatter tree, build output, cached bytecode, and virtualenv.
- Renamed ignore support to `tctidier-ignore` directives and `respectIgnore` configuration.
- Workspace formatting now reports formatted, unchanged, skipped-dirty, and failed file counts instead of treating all non-edits the same.
- Extension packaging now runs the full verification suite before publish.

### Added

- A single native TypeScript formatter path used by:
  `Format Document`, `TcTidier: Format Current Document`, and `TcTidier: Format Workspace TwinCAT Files`.
- UI triggers for current-document formatting in the editor toolbar and status bar.
- Fixture, phase, and benchmark verification flow driven by `npm test` and `npm run verify`.
- Snapshot coverage for `.st` and `.iecst` files in addition to TwinCAT XML-backed file types.
- VS Code integration tests for current-document and workspace formatting flows.

## [0.1.0] - 2026-03-02

### Added

- VS Code extension activation and document-formatting provider in `src/extension.ts`.
- Native formatter modules in `src/native` for config loading, protection, alignment, indentation, expressions, whitespace normalization, and formatting orchestration.
- Debug launch/tasks for Extension Development Host runs.
- Committed fixture corpus and benchmark baseline for formatter regression coverage.

### Fixed

- CASE branch indentation when labels include inline comments.
- Multiline call indentation and related idempotence issues surfaced during fixture promotion.
