# Contributing

TcTidier is a TypeScript VS Code extension. The old Python formatter tree has been removed, so new work should target the native formatter in `src/native` and the extension entrypoint in `src/extension.ts`.

## Setup

```bash
npm install
npm run build
```

For interactive debugging, open the repo in VS Code and press `F5`.

If you need custom npm certificate or proxy settings, keep them in your user-level npm config or CI secrets rather than in committed repo files.

## Branching Model

This repo uses GitFlow:

- Start day-to-day work from `develop`.
- Create `feature/*` branches from `develop`.
- Cut `release/*` branches from `develop` when preparing a release.
- Cut `hotfix/*` branches from `main` for urgent production fixes.
- Merge releases and hotfixes back into both `main` and `develop`.

See [GitFlow](GITFLOW.md) for the exact branch rules and release sequence.

## Where To Change Things

- `src/extension.ts`
  VS Code commands, formatter registration, toolbar/status bar wiring, and workspace formatting.
- `src/native/*.ts`
  Formatter pipeline, config loading, indentation, alignment, expression handling, and protection helpers.
- `tests/native-fixtures.test.js`
  Snapshot-style regression coverage against the committed fixture corpus.
- `tests/native-phases.test.js`
  Narrow tests for specific formatter phases and helpers.
- `tests/fixtures/input`
  Raw input fixtures.
- `tests/fixtures/expected`
  Expected formatter output for the matching input fixtures.

## Test Expectations

Run before sending a change:

```bash
npm test
npm run verify
```

When preparing a release branch or tag, run:

```bash
npm run release:check
```

Use these when you are changing performance-sensitive code:

```bash
npm run bench
npm run bench:compare
```

## Adding Formatter Coverage

When a real-world file exposes a bug:

1. Reduce it to the smallest representative TwinCAT snippet.
2. Add the source case under `tests/fixtures/input`.
3. Add the expected output under `tests/fixtures/expected`.
4. Add or extend a phase test if the bug belongs to a specific helper.

The committed fixture corpus is the single source of truth for formatter regression testing. Do not reintroduce ad hoc test files in the repo root.

## Guidelines

- Keep edits ASCII unless the file already needs something else.
- Prefer small, targeted formatter changes over broad rewrites.
- Preserve idempotence.
- Keep workspace formatting behavior aligned with single-document formatting.
- Update docs when commands, setup, or user-visible behavior changes.

## Pull Requests

- Keep each PR focused on one behavior change or cleanup.
- Target `develop` for normal `feature/*` work.
- Target `main` for `release/*` and `hotfix/*` PRs, then back-merge the result into `develop`.
- Explain the formatter behavior before and after the change.
- Call out any added fixtures or benchmark impact.
- Include screenshots only if the VS Code UI changed.
