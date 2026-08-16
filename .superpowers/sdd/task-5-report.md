# Task 5 report: redacted refusal packet and immutable Public Core snapshots

## Scope delivered

- `buildRefusalPacket` creates the terminal `RefusedPendingSovereignty` model
  with a no-effect simulation, rollback boundary, safer alternatives, vote
  evidence, the P0 policy version, and a waiting message.
- Vote evidence is passed through `redactForCore` while the packet is built, so
  the packet is Core-safe before any ledger append.
- `InMemoryLedger` redacts on append and returns deep snapshot values from both
  `getRefusalPacket` and `exportRecords`; callers cannot mutate stored evidence.

## Review repair

The first review found two Important gaps: sentinel-bearing vote text was
visible before ledger ingestion, and `getRefusalPacket` exposed a mutable
internal reference. Commit `c6506e8` closes both paths and adds nested mutation
regressions for votes, alternatives, and target scope.

## Verification evidence

- Focused packet and ledger suites: 2 suites / 4 tests passed.
- `npm run typecheck`: passed.
- `npm run test:all`: 7 suites / 14 tests passed.
- `git diff --check`: passed.
- Independent re-review: specification and code quality both approved; no
  Critical, Important, or Minor findings remain.

## Scope confirmation

No Runtime, Vault, executor, process, network, sovereign-key, authorization,
model, or UI path was added.
