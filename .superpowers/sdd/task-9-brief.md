# JARVIS P0 Task 9 — Logical Resource-ID Boundary

## Objective

Close the final whole-branch review findings on logical resource IDs and the
documentation gate. This is a narrow P0 hardening task; it adds no capability.

## Authoritative inputs

- Architecture baseline: `docs/superpowers/specs/2026-08-16-jarvis-p0-architecture-baseline.md`
- Final review thread: `codex://threads/01a00a31-f26f-78e0-852d-65e28bd9a9fd`
- Starting branch: current `dev` at/after `bd7c3ed`

## Required behavior

1. Define one reusable production validator for logical resource IDs and use it
   both at the ActionIntent structural boundary and in fake host path policies.
2. Keep existing IDs such as `resource:one` and colon-separated logical
   namespaces valid.
3. Reject before classification/Runtime/ledger any ID containing platform or
   traversal semantics, including drive-letter paths, `/`, `\`, `.` or `..`
   path/identifier segments, empty segments, whitespace/control characters,
   URI-style path escapes, or an empty `resource:` suffix.
4. The Windows and macOS fake `LocalPathPolicy` implementations must apply the
   same rule before the Core flow. A rejected ID must produce no Runtime brief,
   no ledger record, and no desktop packet; key-store/process call counts remain
   zero.
5. Keep the P0 Authority Kernel unable to execute and preserve all 64 existing
   acceptance tests.
6. Remove the EOF blank-line warnings in
   `.superpowers/sdd/task-4-report.md`, `task-5-report.md`, and
   `task-6-report.md` so `git diff --check 3078270..HEAD` is silent.

## Required test-first regressions

- Unit matrix for valid logical IDs and dangerous inputs such as
  `resource:C:/Windows`, `resource:a/../../private`, `resource:a\\..\\private`,
  `resource:..`, `resource:.`, `resource:`, double/empty namespace segments,
  whitespace, and control characters.
- Direct `AuthorityKernel.submit` rejects malformed IDs before Runtime and
  ledger activity.
- The same host-composed rejection test passes for fake Windows and fake macOS,
  with no Runtime/ledger/desktop/key/process activity.

## Hard redlines

- No real filesystem path resolution, network, process, Harness, model, Vault,
  external account, UI, key verification, approval, or executor.
- Do not make logical resource IDs platform-specific.
- Do not weaken existing redaction, vote validation, or refusal semantics.

## Verification and report

Run and record:

```text
npm ci
npm run typecheck
npm run test:all
git diff --check 3078270..HEAD
git status --short
```

Write `.superpowers/sdd/task-9-report.md`, include red-green evidence, changed
files, exact test counts, finding mapping, remaining risks, and commit SHAs.
Commit all task changes on a named task branch.
