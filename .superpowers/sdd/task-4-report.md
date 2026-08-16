# Task 4 report: deterministic L3 governance vote collection

## Scope delivered

- Added `P0_POLICY_VERSION` with the fixed P0 registry value.
- Added `FakeRuntimeAdapter`, a fixture-only `RuntimeAdapter` that records each
  received redacted brief and returns deterministic, complete role votes.
- Added `collectVotes`, which requests planner, safety, and recovery votes with
  the validated digest, P0 policy version, and `redactIntentForRuntime` output.
- Added focused orchestration tests for redaction, deterministic rejection,
  fixed role selection, and digest/policy propagation.

## TDD evidence

1. Added the orchestration tests before the production modules existed.
2. After installing the lockfile dependencies, `npm run test --
   tests/governance/orchestrator.test.ts` failed because
   `fake-runtime-adapter.js` was absent.
3. Implemented the minimum requested registry, fake adapter, and collector.
4. The focused test and typecheck then passed.

## Final verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | passed |
| `npm run test -- tests/governance/orchestrator.test.ts` | passed: 2 tests |
| `npm run test:all` | passed: 5 files, 10 tests |
| `git diff --check` | passed |
| Static scope scan | no `child_process`, `fetch`, or Harness imports in the new runtime collector files |

## Simplification review

The shared immutable `RuntimeBrief` alias keeps the fake port input and its
public capture array exactly aligned. No further abstraction was added: role
selection stays explicit in the collector, and fixture behavior stays local to
the test-only adapter.

## Concerns

None within Task 4 scope. Runtime responses remain intentionally unvalidated
at this collection boundary; later governance validation/authorization stages
must not treat collection as authorization.
