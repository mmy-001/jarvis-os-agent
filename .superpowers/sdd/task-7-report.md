# Task 7 report: JARVIS P0 refusal-slice acceptance

## Scope delivered

- Added full-slice acceptance coverage for explicit reject, missing, malformed,
  digest mismatch, policy-version mismatch, and Runtime-throw results.
- `collectVotes` now validates the complete vote shape and turns every invalid
  result or adapter exception into a synthetic, redacted reject bound to the
  submitted digest and current P0 policy version.
- Added assertions that Core exports and all three Runtime briefs omit both the
  test sentinel and the Vault reference, while sharing one digest and policy
  version.
- Added the Task 6 Minor regression: a non-L3 intent throws before any Runtime
  request or ledger append and still has no execution capability.
- Added matching Windows/macOS logical-ID host-port acceptance coverage.

## TDD and verification evidence

- RED: `npm run test -- tests/integration/l3-refusal-slice.test.ts tests/integration/portable-host-ports.test.ts` produced the expected five failures for missing, malformed, digest mismatch, policy-version mismatch, and Runtime exception handling.
- GREEN: the same focused command passed: 2 files / 10 tests.
- `npm run typecheck`: passed.
- `npm run test:all`: passed: 10 files / 27 tests.
- `git diff --check`: passed.
- Source scan found no real Runtime, process, network, executor, or Vault
  invocation; only the intentionally unavailable port interface declarations
  remain.

## Scope confirmation

No authorization success path, capability issuance, executor invocation, Vault
plaintext access, model, network, process, UI, or native host implementation
was added.

## Review-remediation addendum

- Added the unanimous-valid-approve plus forged-authorization acceptance case.
  It remains `RefusedPendingSovereignty`, reports no execution capability, and
  uses the throwing effect and Vault doubles.
- The reject-like matrix now checks the returned record itself for both secret
  markers and verifies each planner reject remains bound to the persisted digest
  and policy version. Invalid cases also require the synthetic-unavailable
  reason.
- Tightened UTC timestamp validation to require a strict millisecond ISO form
  whose `Date#toISOString()` round-trips exactly, rejecting normalized
  nonexistent calendar dates.
- RED: the focused integration command failed 1 test, with planner returning
  `approve` for `2026-02-30T00:00:00.000Z` before the round-trip check.
- GREEN: focused integration tests passed: 2 files / 12 tests.
- `npm run typecheck`: passed.
- `npm run test:all`: passed: 10 files / 29 tests.
- `git diff --check`: passed.
