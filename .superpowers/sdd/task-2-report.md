# JARVIS P0 Task 2 Report

## Scope

- Added deterministic L3 classification in `src/action-intent/classify.ts`.
- Added validated, canonical SHA-256 intent digests in `src/action-intent/canonicalize.ts`.
- Added the focused regression coverage in `tests/action-intent/classify.test.ts`.
- Did not modify the frozen domain or port contracts, and added no Runtime, network, execution, secret, Vault-plaintext, authorization-success, or UI path.

## TDD record

1. Wrote the focused classifier and digest tests before production modules existed.
2. Initial test execution could not start because dependencies were absent: `'vitest' is not recognized as an internal or external command`.
3. Ran `npm ci` from the committed lockfile; it installed 54 packages and reported `found 0 vulnerabilities`.
4. Re-ran `npm run test -- tests/action-intent/classify.test.ts`; it failed as intended because `../../src/action-intent/canonicalize.js` did not exist.
5. Added the minimal classifier and canonicalization modules.

## Verification

| Command | Result |
| --- | --- |
| `npm run test -- tests/action-intent/classify.test.ts` | PASS: 1 file, 2 tests passed |
| `npm run typecheck` | PASS: `tsc --noEmit` exited 0 |
| `npm run test:all` | PASS: 2 files, 3 tests passed |
| `git diff --check` | PASS: no output, exit 0 |

The focused tests demonstrate that external effect, credential data, irreversible intent, and unbounded intent always classify as `L3`; model-like narrative text does not reduce a level; reordered equivalent resource IDs yield the same 64-character lowercase SHA-256 digest.

## Simplification review

Reviewed the changed files and current source tree. No existing intent canonicalization or classification helper was available to reuse. The implementation deliberately keeps the policy decision as one explicit boolean expression and canonicalizes the target IDs once for both the returned intent and hash payload. No speculative behavior or unrelated abstraction was added.

## Concerns

None within Task 2 scope. `npm ci` created a local untracked `node_modules/` directory solely for verification. The environment rejected the attempted removal before it ran; this directory is not staged or committed.

## Review remediation: stable top-level canonical order

Review found that the original digest payload used object spread, which preserves the caller's top-level property insertion order. Therefore, semantically identical `ActionIntent` objects constructed with a different property order produced different SHA-256 inputs and digests.

Added a regression test that constructs two equivalent `ActionIntent` values in reverse top-level insertion orders (with their target IDs also reversed). The test initially failed with distinct digests. `validateAndDigest` now builds its JSON input from an explicit payload whose keys follow the frozen contract order: `id`, `operation`, sorted `targetResourceIds`, `dataClass`, `externalEffect`, `reversible`, `bounded`, normalized `vaultRef`, and `userDescription`.

### Remediation verification

| Command | Result |
| --- | --- |
| `npm run test -- tests/action-intent/classify.test.ts` | PASS: 1 file, 3 tests passed |
| `npm run typecheck` | PASS: `tsc --noEmit` exited 0 |
| `npm run test:all` | PASS: 2 files, 4 tests passed |
| `git diff --check` | PASS: no output, exit 0 |

Simplification review found no existing canonicalization helper to reuse. The explicit payload is intentionally local and direct: it removes spread-order dependence without adding indirection or changing validation, classification, or side-effect boundaries.
