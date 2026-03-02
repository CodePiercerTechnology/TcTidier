# Formatter Guide

This guide describes the current native TypeScript formatter used by the VS Code extension.

## Scope

TcTidier currently formats entire documents. It does not provide range formatting.

Supported file types:

- `.TcPOU`
- `.TcGVL`
- `.TcDUT`
- `.TcIO`
- `.st`
- `.iecst`

## Formatter Priorities

- Deterministic output
- Idempotent output
- No string literal mutation
- Comment preservation where practical
- Stable indentation for TwinCAT control structures

## Key Behaviors

### Function Calls

Long calls expand to one argument per line.

```iec-st
SomeFunction(param1, param2, param3, param4);
```

becomes:

```iec-st
SomeFunction(
    param1,
    param2,
    param3,
    param4
);
```

### Named Parameters

Named arguments align their `:=` operators when the call is multiline.

```iec-st
FB_Instance(
    Enable        := TRUE,
    Speed         := 1500,
    Acceleration  := 100
);
```

### Assignments And Logical Chains

Long assignments and boolean expressions break into structured continuation lines.

```iec-st
EnableMotion :=
    AxisReady
    AND SafetyOk
    AND MotionRequest;
```

### One-Line IF Blocks

When enabled, one-line `IF ... THEN ... END_IF` statements expand into a block form.

```iec-st
IF flag THEN value:=1; END_IF
```

becomes:

```iec-st
IF flag THEN
    value:=1;
END_IF
```

### CASE Blocks

CASE labels indent once under `CASE`, and the statements below a label indent one additional level.

```iec-st
CASE cycleCounter OF

    1: // Manual mode
        autoModeEnabled := FALSE;

    2: // Auto mode
        autoModeEnabled := TRUE;
    END_CASE
```

Labels with inline comments are treated as labels, not plain statements.

### Ignore Directives

Supported ignore directives:

```iec-st
// tctidier-ignore
value    :=    Messy();
```

```iec-st
(* tctidier-ignore-start *)
KeepThis := Exactly();
(* tctidier-ignore-end *)
```

## Config Resolution

The formatter walks upward from the current file or workspace root looking for `.tctidier.json`.

## Important Options

```json
{
  "indent": 4,
  "useTabs": true,
  "alignDeclarations": true,
  "alignAssignments": true,
  "alignNamedParameters": true,
  "normalizeOneLineIf": true,
  "blankLineBetweenCaseBranches": true,
  "maxLineLength": 90,
  "printWidth": 100,
  "caseIndent": 4,
  "multilineIndent": 4
}
```

## Internal Phases

The native formatter is intentionally split into small modules:

- `config.ts`
  Loads and caches formatter configuration.
- `protection.ts`
  Handles string protection, ignore extraction, and spacing normalization helpers.
- `alignment.ts`
  Aligns declarations, assignments, and variable blocks.
- `indentation.ts`
  Applies structural indentation rules for blocks, CASE labels, and multiline calls.
- `expressions.ts`
  Expands multiline calls and expressions when needed.
- `whitespace.ts`
  Normalizes blank lines and simple whitespace issues.
- `formatter.ts`
  Coordinates the overall formatting pipeline.

## Testing Strategy

- `tests/native-fixtures.test.js`
  Verifies the committed input/output fixture corpus.
- `tests/native-phases.test.js`
  Verifies targeted helpers and phase behavior.
- `benchmarks/native-benchmark.js`
  Measures baseline throughput over the fixture corpus.
- `benchmarks/compare-benchmark.js`
  Compares the current run against the committed benchmark smoke baseline.

## Working Rule

When a formatting bug is found, reduce it into a committed fixture before or alongside the fix.
