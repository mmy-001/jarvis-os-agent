# JARVIS OS Agent

JARVIS OS Agent is a local-first personal-agent operating layer built around a
replaceable DeepSeek Harness runtime boundary. The product owns authority,
policy, memory, migration, and host integration; the runtime supplies agent
execution and session streaming but can never authorize a local side effect.

## Current milestone: P0

P0 is a deliberately no-side-effect vertical slice for the highest-risk L3
path. It proves that a credential-bearing or external intent is classified
deterministically, reviewed by Planner/Safety/Recovery, and converted into a
redacted simulation and recovery packet. Even unanimous fake votes or a forged
sovereign authorization cannot create an execution capability.

This milestone does **not** launch the real Harness process, mutate a file,
contact a network service, read Vault plaintext, or ship a desktop UI. Those
capabilities are intentionally staged behind the reviewed authority boundary.

## Quick start

Requirements: Node.js 22 or newer and npm.

```powershell
npm ci
npm run typecheck
npm run test:all
```

The current acceptance suite runs entirely with deterministic fakes. It covers
L3 classification, canonical digests, three-role evidence, fail-closed Runtime
results, Core/Vault redaction, refusal-packet persistence, forged-key
non-bypass, forbidden-capability boundaries, and equivalent Windows/macOS host
composition.

## Safety invariants

- Public Core contains only redacted, exportable evidence; Vault references and
  known secret sentinels cannot cross into Runtime briefs or Core records.
- Missing, malformed, stale, mismatched, sensitive, or rejecting role evidence
  becomes a deterministic rejection.
- Sovereign authorization cannot override a rejection.
- P0 exposes no execution capability and imports no real network, process,
  model, Harness, UI, or external-account SDK.
- Windows and macOS share product-owned host ports for keys, logical paths,
  process supervision, and desktop interaction.

## Repository map

- `src/action-intent` — structural validation, risk normalization, digest, and
  deterministic classification.
- `src/authority` — the fail-closed P0 Authority Kernel.
- `src/governance` — role orchestration and safe Runtime evidence projection.
- `src/redaction` — Runtime allow-listing and data-only Core projection.
- `src/refusal-packet` — simulation, rollback limits, alternatives, and waiting
  state.
- `src/public-ledger` — append-only in-memory P0 evidence store.
- `src/composition` — portable host composition for the refusal flow.
- `docs/superpowers/specs` — reviewed architecture baseline.
- `docs/superpowers/plans` — executable implementation plan.
- `.superpowers/sdd` — task briefs, implementation reports, and progress ledger.

## Development control plane

Feature work is isolated in Git worktrees, implemented test-first, reviewed by
an independent task, and integrated into `dev` only after the review is clean.
The remote `main` branch receives reviewed changes through a pull request; it
is never force-pushed by the control plane.

## Next product slices

1. Windows desktop shell and local service lifecycle.
2. Version-pinned, out-of-process DeepSeek Harness adapter with a fake JSON-RPC
   compatibility peer before the real runtime is enabled.
3. Encrypted local Vault and device-bound sovereign-key threat model.
4. Capability-limited file/terminal actions with simulation and rollback.
5. Local memory, identity/skill packs, migration bundles, and later voice and
   multi-agent product surfaces.

The architecture baseline and current limitations are documented in
`docs/superpowers/specs/2026-08-16-jarvis-p0-architecture-baseline.md`.
