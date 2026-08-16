## [ERR-20260816-RG1] packaged-ripgrep-access-denied

**Logged**: 2026-08-16T00:00:00-07:00
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
The `rg.exe` bundled in the WindowsApps Codex installation cannot start from this project because Windows denies execution access.

### Error
```
Program 'rg.exe' failed to run: ... app\\resources\\rg.exe ... 拒绝访问。
```

### Context
- Reproduced with `rg --files` and direct `rg.exe --version`.
- The resolved executable is under `C:\\Program Files\\WindowsApps\\OpenAI.Codex_*\\app\\resources\\rg.exe`.

### Suggested Fix
Use PowerShell enumeration or Git-aware commands for this workspace until a separately installed, executable ripgrep is available.

### Metadata
- Reproducible: yes
- Related Files: none

---

## [ERR-20260816-JS1] javascript-powershell-here-string-mixup

**Logged**: 2026-08-16T04:00:00-07:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
A PowerShell here-string (`@' ... '@`) was placed directly in the JavaScript
orchestration source instead of inside a JavaScript string, so the dispatcher
failed to parse before the read-only repository inspection could run.

### Error
```
SyntaxError: Invalid or unexpected token
```

### Context
- The intended operation only read Git status, worktrees, package metadata,
  source paths, and recent commits.
- The nested shell command never started, so no repository state changed.

### Suggested Fix
Represent multi-line PowerShell as a JavaScript template literal passed to
`exec_command.cmd`; PowerShell here-strings are valid only inside that string.

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-08-16T04:01:00-07:00
- **Notes**: Rebuilt the dispatcher input as a JavaScript template literal.

---

## [ERR-20260816-GR1] powershell-git-range-interpolation

**Logged**: 2026-08-16T03:48:00-07:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
A Git revision range written as `$base..$head` in PowerShell was not passed as
one revision-range argument, so `git diff --stat` printed its usage text.

### Error
```
usage: git diff [<options>] [<commit>] ...
```

### Context
- The full review package had already been generated successfully by the Bash
  helper; only the redundant human-readable stat command failed.
- PowerShell variable/range parsing made the unquoted expression ambiguous.

### Suggested Fix
Construct Git revision ranges explicitly as `"${base}..${head}"` before passing
them to Git on Windows PowerShell.

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-08-16T03:49:00-07:00
- **Notes**: Re-ran the read-only stat with an explicitly quoted revision range.

---

## [ERR-20260816-TL1] list-threads-non-json-response

**Logged**: 2026-08-16T03:40:00-07:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
`codex_app__list_threads` was called with `limit: 60`, above the documented
maximum of 50. The tool returned a plain-text argument error, and unconditional
`JSON.parse` then produced a misleading secondary syntax error.

### Error
```
SyntaxError: Unexpected token 'l', "list_threa"... is not valid JSON
```

### Context
- The failure occurred while locating the newly created Task 7 review thread.
- The direct tool error was `limit: Too big: expected number to be <=50`.
- No repository or task state changed during either failed read.

### Suggested Fix
Keep `list_threads.limit <= 50`, inspect string results before parsing, and
never create a duplicate thread in response to a read-only lookup failure.

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-08-16T03:41:00-07:00
- **Notes**: Corrected the parameter to 50 and retained the already-created review thread.

---

## [ERR-20260816-GH1] github-git-https-transport-timeout

**Logged**: 2026-08-16T04:20:00-07:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Native Git HTTPS cannot currently reach GitHub on port 443 from this host,
while authenticated `gh api` requests to the same repository succeed.

### Error
```
fatal: unable to access 'https://github.com/mmy-001/jarvis-os-agent.git/':
Failed to connect to github.com port 443 after 21158 ms: Could not connect to server
```

### Context
- `git ls-remote --heads origin` failed with exit 128.
- `gh auth status` succeeded for `mmy-001` with `repo` scope.
- `gh api` confirmed remote `main` at `76a5fbf` containing only `README.md`.
- The local repository has an independent product history; force-pushing or
  overwriting remote `main` is not an acceptable workaround.

### Suggested Fix
Use the GitHub Git Data API to publish a review branch rooted at remote `main`,
then open a normal PR. Re-test native Git transport before preferring the API
fallback, and keep the fallback/reporting explicit.

### Metadata
- Reproducible: yes
- Related Files: none

### Resolution
- **Resolved**: 2026-08-16T07:21:00-07:00
- **Notes**: Published an exact 47-file snapshot with the Git Data API on a
  branch parented to remote `main`; verified every blob SHA and mode, opened PR
  #1, confirmed `mergeable_state: clean`, and merged without force-pushing.

---

## [ERR-20260816-RM1] assumed-local-readme-existed

**Logged**: 2026-08-16T06:23:00-07:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
The delivery audit attempted to read a root `README.md` before checking that the
independently initialized local history actually contained one.

### Error
```
Cannot find path 'README.md' because it does not exist.
```

### Context
- Remote `main` had an initialization README, but the independent local product
  history did not share that commit or file.
- Source, tests, and Git state were unaffected.

### Suggested Fix
Use `Test-Path` or enumerate the root before reading optional delivery files;
the completion audit should treat a missing README as a product handoff gap.

### Metadata
- Reproducible: yes
- Related Files: `README.md`

### Resolution
- **Resolved**: 2026-08-16T06:24:00-07:00
- **Notes**: Added a product README with scope, safety invariants, quick start,
  repository map, worktree flow, and next slices.

---
