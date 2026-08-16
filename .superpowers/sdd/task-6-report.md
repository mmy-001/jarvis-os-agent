# Task 6 report: fail-closed Authority Kernel

## Scope delivered

- Added `AuthorityKernel.submit` as the sole P0 orchestration entry point.
- Only L3 reaches vote collection; the only completed state is
  `RefusedPendingSovereignty`.
- `SovereignAuthorization` is accepted for future API compatibility but is not
  read or verified, and cannot change the refusal result.
- `EffectExecutor` and `VaultGateway` are structurally unused;
  `hasExecutionCapability(): false` is both a literal type and runtime result.

## Verification evidence

- Focused Authority Kernel suite: 3 tests passed.
- `npm run typecheck`: passed.
- `npm run test:all`: 8 files / 17 tests passed.
- `git diff --check`: passed.
- Independent review: specification passed; code quality passed with one Minor.

## Recorded Minor

The task test file does not directly exercise a lower-than-L3 input and prove
that it fails before vote collection and ledger append. The implementation
contains that guard; Task 7 acceptance must add the explicit regression before
the full branch can be considered complete.

## Scope confirmation

No executor, Vault, authorization verification, real Runtime, network, process,
key, model, UI, approval, or capability issuance path was added.
