# Task 3 report: portable no-effect ports and allow-list redaction

## Scope delivered

- Added `redactIntentForRuntime`, which constructs a fresh Runtime brief using
  only approved `ActionIntent` fields. It omits both `vaultRef` and
  `userDescription`.
- Added `redactForCore`, which replaces the L3 test secret sentinel with
  `[REDACTED]` before returning the JSON-safe value.
- Added portable Windows/macOS logical-ID fakes. Both use the same pure
  `LocalPathPolicy` implementation and never call host APIs.
- Added fail-closed doubles for effect execution, Vault decryption, key-store
  access, and process start. Each method returns `never` by throwing its
  L3-refusal error before any effect could occur.

## TDD evidence

1. Added the redaction and no-effect test suites first.
2. The first focused test command was blocked because this fresh worktree did
   not contain `node_modules` (`'vitest' is not recognized`). Ran `npm ci`
   using the checked-in lockfile; npm reported `added 54 packages` and `found
   0 vulnerabilities`.
3. Re-ran the focused suite before implementation. It failed as intended with
   `Cannot find module '../../src/redaction/redactor.js'` and
   `Cannot find module '../helpers/no-effect-doubles.js'`.
4. Added the smallest implementation, then corrected the two method signatures
   to accept the frozen port-contract arguments required by TypeScript.

## Final verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed (exit 0) |
| `npm run test -- tests/redaction/redactor.test.ts tests/ports/no-effect-doubles.test.ts` | Passed: 2 files, 4 tests |
| `npm run test:all` | Passed: 3 files, 5 tests |
| Runtime allow-list static scan for `intent.vaultRef` / `intent.userDescription` | Passed |
| `git diff --check` | Passed (exit 0, no output) |

The tests assert that the Runtime brief contains neither the secret sentinel nor
the opaque Vault reference, that host logical-ID output is identical, and that
executor, Vault, key-store, and process access always throw their fail-closed
errors.

## Intentional limits and concerns

- No runtime adapter, network code, child process, Vault plaintext, real
  key-store, authorization-success path, or UI was added.
- `redactForCore` follows the brief's JSON-safe generic contract; it is not an
  arbitrary object-cloning utility for non-JSON values.

## Review follow-up: Runtime brief allow-list regression guard

- Strengthened `tests/redaction/redactor.test.ts` to assert that
  `Object.keys(brief)` is exactly the seven approved fields, in their emitted
  order: `id`, `operation`, `targetResourceIds`, `dataClass`,
  `externalEffect`, `reversible`, and `bounded`.
- Added explicit absence assertions for `vaultRef` and `userDescription`.
- Deliberately did not change `redactForCore`; its previously noted minor scope
  limitation remains for a later task.

### Follow-up verification

| Command | Result |
| --- | --- |
| `npm run test -- tests/redaction/redactor.test.ts` | Passed: 1 file, 2 tests |
| `npm run typecheck` | Passed (exit 0) |
| `npm run test:all` | Passed: 3 files, 5 tests |
| `git diff --check` | Passed (exit 0; only Git CRLF warning) |
