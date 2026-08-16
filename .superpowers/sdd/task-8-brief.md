# JARVIS P0 Task 8 — Final Review Remediation

## Objective

Resolve every finding from the final whole-slice review without widening P0 beyond the no-side-effect L3 refusal slice. Work test-first, keep the Authority Kernel incapable of execution, and leave a complete implementation report in `.superpowers/sdd/task-8-report.md`.

## Authoritative inputs

- Architecture: `docs/superpowers/specs/2026-08-16-jarvis-p0-architecture-baseline.md`
- Plan: `docs/superpowers/plans/2026-08-16-jarvis-p0-l3-refusal-slice.md`
- Review thread: `codex://threads/01a00a31-f26f-78e0-852d-65e28bd9a9fd`
- Starting branch: current `main` after Task 7 and controller bookkeeping.

## Required fixes

### 1. Critical — content-safe Runtime/Core projections

- `redactIntentForRuntime` must remain an explicit field allow-list and must also sanitize the contents of every permitted string and string-array field.
- A known secret sentinel (`L3_TEST_SECRET_DO_NOT_LEAK`) and any opaque Vault reference/token beginning with `vault:` must be absent from serialized Runtime briefs and all serialized Core records.
- `collectVotes` must never cast or return the Runtime's original object. Return a newly constructed `GovernanceVote` containing only the schema fields.
- Runtime votes carrying extra `vaultRef` fields, sentinel text, or `vault:` content in `reason`/`evidenceRefs` must fail closed to the deterministic synthetic reject, or be projected through a demonstrably safe sanitizer. Prefer rejection for evidence integrity.
- `redactForCore` must recursively prevent known sentinel text, any `vault:` token, and any `vaultRef` property from surviving serialized output. Preserve public contracts and immutable ledger snapshots.

### 2. Important — malformed risk attributes fail closed to L3

- Add runtime validation for `dataClass`, `externalEffect`, `reversible`, and `bounded` rather than trusting TypeScript types.
- Unknown `dataClass` or non-boolean risk flags must not classify as L0 and must not escape before a refusal packet can be produced. Normalize these risk attributes conservatively to a deterministic L3 intent, while still rejecting structurally unusable identifiers/targets.
- Keep stable canonical hashing and sorted target IDs.

### 3. Important — complete fake Windows/macOS host bundles

- Fake Windows and fake macOS bundles must each expose all four logical host ports: `SecureKeyStore`, `LocalPathPolicy`, `ProcessSupervisor`, and `DesktopInteraction`.
- Run the same no-side-effect Core refusal flow against both bundles. It must normalize logical IDs, never use platform paths/APIs, never invoke key-store or process capability, and present the same read-only refusal packet through `DesktopInteraction`.

### 4. Important — automated forbidden-capability boundary

- Add a deterministic source/dependency boundary test that scans production `src/**/*.ts` and relevant package metadata.
- It must fail on imports or use of process execution, network clients/fetch, DeepSeek Harness/runtime packages, real model/UI/account SDKs, or other forbidden P0 capability surfaces.
- Keep throwing executor/Vault/key-store/process doubles as dynamic proof; the static boundary is additional evidence.

### 5. Minor — valid evidence must be substantive

- A Runtime-provided valid vote must contain at least one non-empty, non-sensitive evidence reference.
- Synthetic invalid rejects may keep an empty evidence array.

## Mandatory regression tests

Write failing tests first, observe the intended failures, then implement:

1. Sentinel/vault tokens placed in allowed ActionIntent fields cannot survive a Runtime brief.
2. Runtime vote `reason`, `evidenceRefs`, or an extra `vaultRef` cannot contaminate returned votes, refusal packets, ledger exports, or JSON snapshots.
3. A Runtime vote is an explicit safe projection; extra arbitrary fields are absent.
4. Empty/whitespace evidence and sensitive evidence fail closed to a synthetic reject.
5. Unknown data class and non-boolean risk flags produce L3/refusal, not L0 or a pre-packet throw.
6. Windows and macOS full fake host bundles run the same Core refusal flow and present equivalent packets without invoking unavailable capabilities.
7. The forbidden-capability source boundary detects representative forbidden snippets in its rule tests and passes on the current production tree.
8. Preserve all earlier acceptance tests, including all-approve plus forged sovereign authorization still refusing.

## Non-goals and hard redlines

- No real Harness, network, process, Vault plaintext, external account, executor, key, model, UI, sovereign-key verification, approval branch, or execution capability.
- Do not weaken existing schemas, checks, or tests to make the suite pass.
- No dependency addition unless strictly necessary; prefer pure TypeScript/Node standard library already present in test code.
- Do not change the product vision, create a real APP shell, or implement post-P0 features here.

## Verification and report

Run and record exact results for:

```text
npm ci
npm run typecheck
npm run test:all
git diff --check
```

The report must include: files changed, red-green evidence, each review finding mapped to a fix/test, exact test counts, `git status --short`, remaining risks, and the final commit SHA. Commit all implementation and report changes on the task branch.
