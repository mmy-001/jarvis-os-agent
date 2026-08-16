# Task 9 report: logical resource-ID boundary

## Scope delivered

- Added `isValidLogicalResourceId` and `validateLogicalResourceId` as the
  shared production rule for `resource:` logical namespaces.
- Routed ActionIntent structural validation through that rule, preserving valid
  IDs such as `resource:one` and colon-separated namespaces.
- Routed the fake Windows and macOS `LocalPathPolicy` implementations through
  the same production validator before Core composition.
- Added regressions proving malformed IDs do not create Runtime briefs, ledger
  records, desktop packets, key-store calls, or process calls.
- Added a pre-split guard for Windows drive-relative suffixes such as
  `resource:C:Windows` and `resource:z:relative`.
- Split fake Windows and macOS path policies into explicit independent classes
  while retaining the same shared production validation rule.
- Defined the cross-platform grammar for an ambiguous single-letter first
  namespace: use `resource:ns:<letter>:...`; reserve bare
  `resource:<letter>:...` across all hosts.
- Expanded host-composition drive-relative rejection coverage to the complete
  Windows/macOS × `C:Windows`/`z:relative` matrix.
- Removed the extra EOF blank line from Task 4, Task 5, and Task 6 reports.

## Finding mapping

| Review finding | Evidence in this task |
| --- | --- |
| Logical resource IDs accepted path semantics | The unit matrix rejects drive-style, slash, backslash, traversal, empty-segment, whitespace/control, URI-escape, and empty-suffix forms. |
| Drive-relative paths remained valid after namespace splitting | A pre-split `^[A-Za-z]:` guard rejects `resource:C:Windows` and `resource:z:relative` in unit, AuthorityKernel, and host-composition regressions. |
| ActionIntent and host rules could drift | Both boundaries import the single production validator. |
| Fake platform policies could silently remain the same type | `FakeWindowsPathPolicy` and `FakeMacPathPolicy` are separate classes, with regressions for independent constructors and identical dangerous-input rejection. |
| Single-letter namespaces could be mistaken for an accidental false reject | `RESERVED_AMBIGUOUS_RESOURCE_SUFFIX` and its adjacent comment declare the portable grammar; tests accept `resource:ns:a:private` and reject bare `resource:a:private`. |
| Host rejection evidence covered only one drive-relative input per platform | The third-round test matrix asserts both drive-relative forms on both fake hosts before Core activity. |
| Rejection might happen after Core work | Direct AuthorityKernel and Windows/macOS composition tests assert zero Runtime, ledger, desktop, key, and process activity. |
| Documentation gate warned about EOF whitespace | The three named reports now end at their final content line. |

## TDD evidence

1. Added `tests/action-intent/logical-resource-id.test.ts` before the validator.
2. `npm test -- tests/action-intent/logical-resource-id.test.ts` initially
   produced the expected red result: 5 failed and 14 passed of 19. The failures
   were the drive/slash IDs, a double namespace separator, and Windows/macOS
   host compositions that reached the refusal flow.
3. Added the minimal shared validator and used it at both required boundaries.
4. The same focused command then passed all 19 tests; `npm run typecheck` also
   passed.

## Second review remediation and TDD evidence

1. The independent review identified two valid gaps: `resource:C:Windows` and
   `resource:z:relative` were accepted as logical namespace segments, and both
   fake hosts inherited the same `FakePath` type.
2. Added the second-round unit, direct AuthorityKernel, Windows/macOS host, and
   fake-policy-type regressions before implementation. The focused suite then
   produced the expected red result: 7 failed and 19 passed of 26. Failures
   showed the two IDs reaching the refusal flow and both policies sharing a
   constructor.
3. Added the suffix-level drive-relative guard before `:` splitting, and
   replaced the shared fake policy with `FakeWindowsPathPolicy` and
   `FakeMacPathPolicy`, each delegating to the production validator.
4. The focused suite passed all 26 tests. The complete suite subsequently
   passed 12 files and 90 tests, including zero Runtime/ledger/desktop/key/
   process activity assertions for malformed host-composed input.

## Third review remediation and TDD evidence

1. The final review identified an ambiguity in the policy explanation: a bare
   single-letter first namespace is indistinguishable from a Windows
   drive-relative form, while an explicitly namespaced single-letter segment
   is not.
2. Added the grammar-constant regression, `resource:ns:a:private` acceptance,
   bare `resource:a:private` rejection, and the complete 2×2 fake-host matrix
   before production changes. The focused suite produced the expected red
   result: 1 failed and 30 passed of 31 because the required grammar constant
   was not yet declared.
3. Added `RESERVED_AMBIGUOUS_RESOURCE_SUFFIX` and an adjacent grammar comment;
   the validator now uses that constant before namespace splitting.
4. The focused suite passed 31 tests. The complete suite subsequently passed
   12 files and 95 tests. Both `C:Windows` and `z:relative` are asserted to
   leave Runtime, ledger, desktop, key-store, and process activity at zero on
   both fake hosts.

## Changed files

- `src/action-intent/logical-resource-id.ts`
- `src/action-intent/canonicalize.ts`
- `tests/helpers/no-effect-doubles.ts`
- `tests/action-intent/logical-resource-id.test.ts`
- `.superpowers/sdd/task-4-report.md`
- `.superpowers/sdd/task-5-report.md`
- `.superpowers/sdd/task-6-report.md`

## Verification evidence

| Check | Result |
| --- | --- |
| `npm ci` | passed: 54 packages installed, 0 vulnerabilities reported |
| `npm run typecheck` | passed |
| `npm run test:all` | passed after third remediation: 12 files, 95 tests |
| `git diff --check 3078270..HEAD` | passed after the report commit |
| `git status --short` | passed after the report commit: no output (clean) |

## Commits

- Implementation and EOF cleanup: `06b61b70a605aacd049fb4a84c4999352b683255`
- Drive-relative and independent-fake-policy remediation: `a3d1d4dd375994ac8f6365df8a0eff53d665994d`
- Unambiguous single-letter namespace grammar: `7555cea17af5b2f59d38757f99fe22b299543308`

## Remaining risks

The portable host proof is intentionally limited to deterministic fake ports;
no native host adapters exist in this P0 slice. The validator deliberately
accepts dots within a normal identifier segment (for example, `alpha.beta`),
while rejecting `.` and `..` as complete segments. No real filesystem,
network, process, Runtime, Vault, key verification, approval, UI, or executor
capability was introduced.
