# JARVIS P0 Task 8 — Final Review Remediation Report

## Scope and commit

- Branch: `codex/jarvis-p0-task-8`
- First implementation commit: `e6f8aae5f3ce20bf7bbff8048c7cbfc4c96eff19`
- Second review implementation commit: `4aa72be1233e23bf1f83d668a7cb8c668429f3ba`
- Third review implementation commit: `7a6dddce8fc64e45d11d4c432b87eebbd3f1ef84`
- Working tree at each implementation commit: clean (`git status --short` produced no output).
- This report is committed immediately after its implementation commit. The report commit SHA is reported outside this self-contained file because a Git commit cannot contain its own final hash.

## Files changed

- `src/action-intent/canonicalize.ts`
- `src/governance/orchestrator.ts`
- `src/redaction/redactor.ts`
- `tests/boundaries/forbidden-capabilities.test.ts`
- `tests/governance/orchestrator.test.ts`
- `tests/helpers/no-effect-doubles.ts`
- `tests/integration/l3-refusal-slice.test.ts`
- `tests/integration/portable-host-ports.test.ts`
- `tests/redaction/redactor.test.ts`

## Review findings mapped to fixes and evidence

| Finding | Fix | Automated evidence |
| --- | --- | --- |
| Critical: Runtime/Core content boundary leaks | Sanitized every allow-listed Runtime string/string-array field; Core redaction recursively removes `vaultRef` and redacts the sentinel and `vault:` tokens; Runtime results are rebuilt as fresh schema-only votes and contaminated evidence rejects synthetically. | `redactor.test.ts`, `orchestrator.test.ts`, `l3-refusal-slice.test.ts` |
| Important: malformed risk values can downgrade/throw | Runtime-risk values are normalized conservatively (`credential`, external, irreversible, unbounded) after structural ID/target validation, before canonical hashing/classification. | `l3-refusal-slice.test.ts` malformed risk matrix; existing canonical-order tests |
| Important: fake host bundles incomplete | Windows/macOS fakes each expose key store, logical path policy, process supervisor, and read-only desktop interaction; both execute the same Core refusal flow and emit equal packets without key/process use. | `portable-host-ports.test.ts` |
| Important: no static P0 capability boundary | Production `src/**/*.ts` plus direct root dependency metadata are scanned deterministically for execution, network, Runtime/model, UI, and account capability surfaces. Rule tests exercise representative forbidden imports/calls. | `forbidden-capabilities.test.ts` |
| Minor: evidence may be empty or unsafe | Valid Runtime evidence now requires one non-empty, trimmed, non-sensitive reference. Empty, whitespace, sentinel, `vault:` and top-level `vaultRef` inputs become deterministic synthetic rejects. | `orchestrator.test.ts` |

## Red-green evidence

1. Added all review regression tests before editing production code.
2. Initial focused command could not start because this clean worktree lacked `node_modules` (`vitest` not recognized). Ran `npm ci` without changing package metadata.
3. Re-ran the focused new-test command: 13 failures / 18 passes across 5 files. Failures showed the unredacted Runtime strings, original Runtime object cast, acceptance of empty/sensitive evidence, missing host ports, and malformed-risk escape; this was the expected red state.
4. After the minimal remediation, the focused suite passed 32/32. A TypeScript check then found and corrected two implementation typing issues (exact optional `vaultRef` and a `RefusalPacket` type import).
5. Final full suite passed 44/44; all prior acceptance coverage, including forged sovereign authorization refusing, remains green.

## Final verification

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0; added 54 packages, audited 55 packages; 0 vulnerabilities. |
| `npm run typecheck` | Exit 0. |
| `npm run test:all` | Exit 0; 11 test files passed, 44 tests passed. |
| `git diff --check` | Exit 0. |

## Remaining risks

- This is deliberately still the no-side-effect refusal slice: there is no real Runtime, network, process, Vault plaintext, model/UI/account SDK, sovereign-key verification, approval path, or executor.
- Redaction detects the specified sentinel and `vault:` references; it is not a general-purpose secret-classification system.
- The static boundary is a deterministic lexical guard over production TypeScript and direct dependency metadata. It complements, but does not replace, a future AST-based audit or runtime sandbox when those systems are in scope.

## Second independent-review remediation

### Review findings mapped to fixes and evidence

| Finding | Fix | Automated evidence |
| --- | --- | --- |
| Critical: direct Core return leaks target data | The refusal packet is projected as a whole and the Authority Kernel projects its full `DecisionRecord` before returning/appending it. | `l3-refusal-slice.test.ts` checks returned record, packet, ledger export, and JSON snapshots. |
| Critical: Core redactor permits serialization hooks | The Core projection reads only own property descriptors; it drops accessors/functions/`toJSON` and sensitive keys, rejects cycles and unsupported values, and never performs a getter-triggering clone. | `redactor.test.ts` covers root/nested getters, `toJSON`, cycles, undefined/non-finite/bigint/symbol/date values, and sensitive keys. |
| Important: Runtime vote TOCTOU | Votes are captured from plain own data descriptors once; accessors, proxy results, array subclasses, and arrays with overridden methods fail closed. | `orchestrator.test.ts` covers flipping getters, overridden arrays, subclasses, and Proxy results. |
| Important: sparse/invalid target IDs | Target arrays are materialized before validation and require `resource:` plus a non-empty legal suffix. | `classify.test.ts` and `l3-refusal-slice.test.ts` cover sparse, undefined, and empty suffix values plus no Runtime/ledger access. |
| Important: host composition was test-only | Added the product-owned `submitL3RefusalThroughHost` helper and explicit `HostBundle` ports. It normalizes IDs, calls the refusal kernel, then presents the packet without touching secure-key or process ports. | `portable-host-ports.test.ts` runs equivalent Windows/macOS composed flows. |
| Important: static boundary bypasses | Added lexical detection for `createRequire`, `process.getBuiltinModule`, `dns`, `node-fetch`, `got`, `superagent`, global network APIs, direct dependencies, and package scripts. | `forbidden-capabilities.test.ts` self-tests every listed bypass form and scans production source/metadata. |
| Minor: non-auditable evidence | Valid evidence now follows `evidence:<visible identifier>` and rejects empty, punctuation-only, control, and zero-width identifiers. | `orchestrator.test.ts` has the substantive-evidence regression matrix. |

### Second-round red-green evidence

1. Added the second-review regression tests before changing production code. The focused run produced 14 expected test failures (plus the expected missing composition-module load failure): unredacted packet targets, getter/`toJSON` behavior, malformed vote snapshots, weak evidence validation, sparse targets, and missing composition.
2. After the first minimal patch, 52 focused tests passed. A new nested-getter regression then exposed one remaining `structuredClone` side effect; it failed with one getter call.
3. Removed that clone path and retained descriptor-only recursive projection. The final suite passed 62/62 tests.

### Second-round final verification

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0; added 54 packages, audited 55 packages; 0 vulnerabilities. |
| `npm run typecheck` | Exit 0. |
| `npm run test:all` | Exit 0; 11 test files passed, 62 tests passed. |
| `git diff --check` | Exit 0. |

### Second-round remaining risks

- JavaScript cannot perfectly distinguish every transparent Proxy from a plain object without invoking traps. Core projection therefore never calls values/getters and recursively accepts only descriptor-based plain data; Runtime-vote capture additionally uses `structuredClone`, causing normal Proxy inputs to fail closed.
- The slice remains intentionally incapable of execution and contains no real Runtime, process, network, Vault plaintext, account, model, UI, key, approval, or executor path.

## Third independent-review remediation

### Review findings mapped to fixes and evidence

| Finding | Fix | Automated evidence |
| --- | --- | --- |
| Important: full Runtime-result clone traverses unused fields | Vote capture now rejects proxies through Node's non-effectful `types.isProxy`, checks only the seven schema fields via own data descriptors, and never clones or reads arbitrary fields. Evidence arrays are copied index-by-index from descriptors and still reject accessors, holes, subclasses, and overridden methods. | `orchestrator.test.ts` confirms an unused nested getter is never called; existing flipping-getter and Proxy regressions remain green. |
| Minor: `__proto__` assignment can pollute Core projection | Core object projections now use a null prototype with `Object.defineProperty`, and drop `__proto__`, `constructor`, and `prototype` keys before projecting values. | `redactor.test.ts` constructs own pollution keys with `JSON.parse`, proves a null prototype and safe JSON output. |

### Third-round red-green evidence

1. Added the two review regressions before production edits. The focused suite failed twice as expected: the unused Runtime nested getter executed once per role (three calls), and assigning `__proto__` changed the projection's prototype.
2. The descriptor-only schema capture and null-prototype definition-property projection made the focused tests pass 23/23.
3. The final full suite passed 64/64 tests.

### Third-round final verification

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0; added 54 packages, audited 55 packages; 0 vulnerabilities. |
| `npm run typecheck` | Exit 0. |
| `npm run test:all` | Exit 0; 11 test files passed, 64 tests passed. |
| `git diff --check` | Exit 0. |

### Third-round remaining risks

- Runtime vote capture depends on Node's `util.types.isProxy` for the explicit Proxy fail-closed boundary; it does not clone, enumerate, or invoke values of arbitrary Runtime fields.
- This P0 refusal slice remains intentionally non-effectful and has no real capability integration.
