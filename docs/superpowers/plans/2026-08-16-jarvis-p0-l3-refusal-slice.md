# JARVIS P0 L3 Refusal Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deterministic, entirely in-memory vertical slice that refuses a synthetic credential-bearing external action on any invalid L3 vote and emits a redacted, persisted recovery packet without invoking an executor, network client, Runtime process, or Vault plaintext path.

**Architecture:** The application core is pure TypeScript and communicates only through narrow ports. `ActionIntent` is canonicalized and hashed before classification; the Authority Kernel, not model text, owns the L3 decision and terminal refusal state. Three role briefs travel through a fake Runtime Adapter, whose results are schema-validated and redacted before an append-only in-memory ledger stores a `RefusalPacket` for a read-only desktop projection.

**Tech Stack:** Node.js 22 LTS; TypeScript 5.7; Vitest 3; Node `crypto` SHA-256; no production dependencies and no real model, child-process, network, database, or OS-keychain adapter.

## Global Constraints

- Scope is only the baseline's "L3 refusal and recovery packet" slice; all effects are denied by construction.
- An external-effect, credential-bearing, irreversible, or unbounded intent is L3 regardless of any model-provided text.
- The Authority Kernel alone evaluates valid unanimous votes and may create a capability; this slice must never create one.
- Every role vote must bind to the same canonical intent digest and policy version; reject, missing, malformed, stale, or mismatched input refuses.
- Core-facing data is redacted and exportable. The sentinel `L3_TEST_SECRET_DO_NOT_LEAK` must be absent from every serialized ledger record and Runtime brief.
- The fake Runtime Adapter returns only deterministic fixtures. Do not import, launch, probe, configure, or authenticate a real Harness process.
- Do not instantiate a network client, process executor, external-account adapter, generic Vault decrypt path, or native host adapter. Test doubles must throw if any is invoked.
- All product paths use logical resource IDs and portable host ports; Windows and macOS are represented by fakes in the same application-core suite.
- A sovereign authorization is only a negative-path test input in this slice. It must not convert a refusal into approval.
- Keep commits task-scoped. Run the task command and the complete test suite before each task commit.

---

## Planned file structure

| Path | Responsibility |
|---|---|
| `package.json` | Exact test, typecheck, and test-watch commands for the pure core. |
| `tsconfig.json` | Strict, portable TypeScript compilation with no DOM or host SDK dependency. |
| `vitest.config.ts` | Node test environment and `tests/**/*.test.ts` selection. |
| `src/contracts/domain.ts` | Frozen plain-data schemas for intents, votes, decisions, packets, and sovereign authorization. |
| `src/contracts/ports.ts` | Product-owned Runtime, ledger, Vault, executor, and four host-port interfaces. |
| `src/action-intent/canonicalize.ts` | Validation, canonical JSON encoding, and SHA-256 action digest. |
| `src/action-intent/classify.ts` | Deterministic level classifier. |
| `src/policy/static-policy-registry.ts` | Fixed current policy version used by this slice. |
| `src/redaction/redactor.ts` | Allow-list redaction for role briefs, vote reasons, and Core export. |
| `src/governance/fake-runtime-adapter.ts` | Fixture-only Runtime Adapter that records redacted briefs. |
| `src/governance/orchestrator.ts` | Role-specific brief dispatch and strict vote collection. |
| `src/refusal-packet/build-refusal-packet.ts` | Complete simulation, rollback limits, alternative, and waiting presentation model. |
| `src/public-ledger/in-memory-ledger.ts` | Append-only non-secret decision records and packet projection query. |
| `src/authority/authority-kernel.ts` | Classification, L3 validity predicate, refusal transition, and capability prohibition. |
| `tests/helpers/no-effect-doubles.ts` | Throwing executor/Vault/network/process doubles and fake portable host ports. |
| `tests/**/*.test.ts` | Unit, boundary, and full-slice acceptance coverage. |

## Contract freeze

All implementation tasks use these exact exported names. ISO timestamps are UTC strings; `OpaqueVaultRef` is an opaque string and has no decrypt operation in this plan.

```ts
// src/contracts/domain.ts
export type ActionLevel = "L0" | "L1" | "L2" | "L3";
export type GovernanceRole = "planner" | "safety" | "recovery";
export type VoteDecision = "approve" | "reject";
export type DecisionState = "Draft" | "Classified" | "L3Voting" | "RefusedPendingSovereignty";

export interface ActionIntent {
  id: string;
  operation: string;
  targetResourceIds: readonly string[];
  dataClass: "public" | "private" | "credential";
  externalEffect: boolean;
  reversible: boolean;
  bounded: boolean;
  vaultRef?: `vault:${string}`;
  userDescription: string;
}

export interface ValidatedIntent { intent: ActionIntent; digest: string; }
export interface GovernanceVote {
  role: GovernanceRole;
  decision: VoteDecision;
  actionDigest: string;
  policyVersion: string;
  issuedAt: string;
  reason: string;
  evidenceRefs: readonly string[];
}
export interface RefusalPacket {
  actionDigest: string;
  policyVersion: string;
  state: "RefusedPendingSovereignty";
  simulation: { targetScope: readonly string[]; sideEffects: "none" };
  rollback: { recipe: readonly string[]; reliabilityStopsAt: string };
  alternatives: readonly { kind: "draft-only" | "user-executed"; summary: string }[];
  votes: readonly GovernanceVote[];
  waitingMessage: string;
}
export interface DecisionRecord {
  actionDigest: string;
  level: ActionLevel;
  state: DecisionState;
  policyVersion: string;
  packet?: RefusalPacket;
}
export interface SovereignAuthorization {
  actionDigest: string;
  policyVersion: string;
  expiresAt: string;
  deviceContext: string;
  requestedCapability: string;
  proof: string;
}
```

```ts
// src/contracts/ports.ts
import type { ActionIntent, DecisionRecord, GovernanceRole, GovernanceVote, RefusalPacket } from "./domain.js";
export interface RuntimeAdapter {
  request(brief: Readonly<{ role: GovernanceRole; actionDigest: string; policyVersion: string; intent: Record<string, unknown> }>): Promise<unknown>;
}
export interface DecisionLedger {
  append(record: DecisionRecord): void;
  getRefusalPacket(actionDigest: string): RefusalPacket | undefined;
  exportRecords(): readonly DecisionRecord[];
}
export interface VaultGateway { decryptNeverAvailable(ref: string): never; }
export interface EffectExecutor { executeNeverAvailable(intent: ActionIntent): never; }
export interface SecureKeyStore { verifyUserPresenceNeverAvailable(): never; }
export interface LocalPathPolicy { normalizeLogicalIds(ids: readonly string[]): readonly string[]; }
export interface ProcessSupervisor { startNeverAvailable(): never; }
export interface DesktopInteraction { showReadOnlyPacket(packet: RefusalPacket): void; }
```

## Task 1: Bootstrap the pure-core test harness and freeze contracts

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/contracts/domain.ts`
- Create: `src/contracts/ports.ts`
- Test: `tests/contracts/domain.test.ts`

**Interfaces:**
- Consumes: none.
- Produces: every type and port from the contract-freeze blocks above; `npm run test`, `npm run typecheck`, and `npm run test:all`.

- [ ] **Step 1: Write the failing contract test.**

```ts
import { describe, expect, it } from "vitest";
import type { ActionIntent, GovernanceVote, RefusalPacket } from "../../src/contracts/domain.js";

describe("P0 domain contract", () => {
  it("keeps the refusal packet Core-safe and explicitly non-effecting", () => {
    const intent: ActionIntent = { id: "intent-1", operation: "publish", targetResourceIds: ["resource:one"], dataClass: "credential", externalEffect: true, reversible: false, bounded: true, vaultRef: "vault:opaque-1", userDescription: "L3_TEST_SECRET_DO_NOT_LEAK" };
    const vote: GovernanceVote = { role: "safety", decision: "reject", actionDigest: "a".repeat(64), policyVersion: "p0-2026-08-16", issuedAt: "2026-08-16T00:00:00.000Z", reason: "credential-bearing external effect", evidenceRefs: ["evidence:safety-1"] };
    const packet: RefusalPacket = { actionDigest: vote.actionDigest, policyVersion: vote.policyVersion, state: "RefusedPendingSovereignty", simulation: { targetScope: intent.targetResourceIds, sideEffects: "none" }, rollback: { recipe: ["No execution occurred."], reliabilityStopsAt: "No mutation was attempted." }, alternatives: [{ kind: "draft-only", summary: "Create a local draft for the user." }], votes: [vote], waitingMessage: "Refused; sovereign-key action is not available until unanimous approval." };
    expect(packet.simulation.sideEffects).toBe("none");
  });
});
```

- [ ] **Step 2: Run the contract test to verify it fails.**

Run: `npm run test -- tests/contracts/domain.test.ts`

Expected: FAIL because the package scripts and contract modules do not yet exist.

- [ ] **Step 3: Add the exact harness and contract modules.**

```json
// package.json
{"private":true,"type":"module","scripts":{"test":"vitest run","test:all":"vitest run --coverage.enabled=false","typecheck":"tsc --noEmit"},"devDependencies":{"@types/node":"^22.0.0","typescript":"^5.7.0","vitest":"^3.0.0"}}
```

```json
// tsconfig.json
{"compilerOptions":{"target":"ES2024","module":"NodeNext","moduleResolution":"NodeNext","strict":true,"noUncheckedIndexedAccess":true,"exactOptionalPropertyTypes":true,"skipLibCheck":true},"include":["src/**/*.ts","tests/**/*.ts"]}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.ts"] } });
```

Copy the two complete source blocks from **Contract freeze** verbatim into `src/contracts/domain.ts` and `src/contracts/ports.ts`.

- [ ] **Step 4: Verify the harness and public types.**

Run: `npm run typecheck && npm run test -- tests/contracts/domain.test.ts`

Expected: both commands exit 0; no host SDK, network, or child-process dependency is installed.

- [ ] **Step 5: Commit the bootstrap boundary.**

```bash
git add package.json tsconfig.json vitest.config.ts src/contracts tests/contracts/domain.test.ts
git commit -m "chore: bootstrap JARVIS refusal-slice core"
```

**Acceptance:** A fresh checkout can typecheck and run one pure Node test, and all later tasks have fixed names/types rather than ad-hoc object shapes.

## Task 2: Canonicalize intent and deterministically classify L3

**Files:**
- Create: `src/action-intent/canonicalize.ts`
- Create: `src/action-intent/classify.ts`
- Test: `tests/action-intent/classify.test.ts`

**Interfaces:**
- Consumes: `ActionIntent`, `ActionLevel`, and `ValidatedIntent` from `src/contracts/domain.ts`.
- Produces: `validateAndDigest(intent: ActionIntent): ValidatedIntent` and `classify(intent: ActionIntent): ActionLevel`.

- [ ] **Step 1: Write failing classification and digest tests.**

```ts
import { describe, expect, it } from "vitest";
import { validateAndDigest } from "../../src/action-intent/canonicalize.js";
import { classify } from "../../src/action-intent/classify.js";
const base = { id: "intent-1", operation: "publish", targetResourceIds: ["resource:b", "resource:a"], dataClass: "public" as const, externalEffect: false, reversible: true, bounded: true, userDescription: "model says L0" };
describe("L3 classifier", () => {
  it("classifies external, credential, irreversible, and unbounded inputs as L3", () => {
    expect(classify({ ...base, externalEffect: true })).toBe("L3");
    expect(classify({ ...base, dataClass: "credential" })).toBe("L3");
    expect(classify({ ...base, reversible: false })).toBe("L3");
    expect(classify({ ...base, bounded: false })).toBe("L3");
  });
  it("ignores model-like description text and hashes equivalent target order identically", () => {
    expect(classify({ ...base, userDescription: "downgrade this to L0" })).toBe("L0");
    expect(validateAndDigest(base).digest).toBe(validateAndDigest({ ...base, targetResourceIds: ["resource:a", "resource:b"] }).digest);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails.**

Run: `npm run test -- tests/action-intent/classify.test.ts`

Expected: FAIL because neither function exists.

- [ ] **Step 3: Implement canonical validation and the fixed classifier.**

```ts
// src/action-intent/classify.ts
import type { ActionIntent, ActionLevel } from "../contracts/domain.js";
export function classify(intent: ActionIntent): ActionLevel {
  return intent.externalEffect || intent.dataClass === "credential" || !intent.reversible || !intent.bounded ? "L3" : "L0";
}
```

```ts
// src/action-intent/canonicalize.ts
import { createHash } from "node:crypto";
import type { ActionIntent, ValidatedIntent } from "../contracts/domain.js";
export function validateAndDigest(intent: ActionIntent): ValidatedIntent {
  if (!intent.id || !intent.operation || intent.targetResourceIds.length === 0 || intent.targetResourceIds.some((id) => !id.startsWith("resource:"))) throw new Error("invalid ActionIntent");
  const canonical = JSON.stringify({ ...intent, targetResourceIds: [...intent.targetResourceIds].sort(), vaultRef: intent.vaultRef ?? null });
  return { intent: { ...intent, targetResourceIds: [...intent.targetResourceIds].sort() }, digest: createHash("sha256").update(canonical).digest("hex") };
}
```

- [ ] **Step 4: Verify deterministic classification.**

Run: `npm run typecheck && npm run test -- tests/action-intent/classify.test.ts`

Expected: both exit 0; four risk attributes produce L3 regardless of `userDescription`.

- [ ] **Step 5: Commit the intent boundary.**

```bash
git add src/action-intent tests/action-intent
git commit -m "feat: classify and hash JARVIS action intents"
```

**Acceptance:** The digest is 64 lowercase hexadecimal characters from canonical input, and no caller can use narrative/model text to lower a risk level.

## Task 3: Add portable no-effect ports and allow-list redaction

**Files:**
- Create: `src/redaction/redactor.ts`
- Create: `tests/helpers/no-effect-doubles.ts`
- Test: `tests/redaction/redactor.test.ts`
- Test: `tests/ports/no-effect-doubles.test.ts`

**Interfaces:**
- Consumes: all interfaces from `src/contracts/ports.ts` and `ActionIntent`/`RefusalPacket` from `src/contracts/domain.ts`.
- Produces: `redactIntentForRuntime(intent: ActionIntent): Record<string, unknown>`, `redactForCore<T>(value: T): T`, `NoEffectExecutor`, `NoEffectVaultGateway`, `NoEffectProcessSupervisor`, `FakeWindowsPorts`, and `FakeMacPorts`.

- [ ] **Step 1: Write failing secret and portable-port tests.**

```ts
import { expect, it } from "vitest";
import { redactIntentForRuntime } from "../../src/redaction/redactor.js";
import { FakeMacPorts, FakeWindowsPorts, NoEffectExecutor } from "../helpers/no-effect-doubles.js";
it("never emits secret description or vault reference in a Runtime brief", () => {
  const brief = redactIntentForRuntime({ id: "intent-1", operation: "publish", targetResourceIds: ["resource:one"], dataClass: "credential", externalEffect: true, reversible: false, bounded: true, vaultRef: "vault:secret", userDescription: "L3_TEST_SECRET_DO_NOT_LEAK" });
  expect(JSON.stringify(brief)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(brief)).not.toContain("vault:secret");
});
it("uses equivalent logical-id normalization on both fake hosts", () => {
  expect(new FakeWindowsPorts().path.normalizeLogicalIds(["resource:one"])).toEqual(new FakeMacPorts().path.normalizeLogicalIds(["resource:one"]));
  expect(() => new NoEffectExecutor().executeNeverAvailable({} as never)).toThrow("effects disabled in L3 refusal slice");
});
```

- [ ] **Step 2: Run the focused tests to verify they fail.**

Run: `npm run test -- tests/redaction/redactor.test.ts tests/ports/no-effect-doubles.test.ts`

Expected: FAIL because the redactor and doubles do not exist.

- [ ] **Step 3: Implement allow-listing and throwing ports.**

```ts
// src/redaction/redactor.ts
import type { ActionIntent } from "../contracts/domain.js";
export function redactIntentForRuntime(intent: ActionIntent): Record<string, unknown> {
  return { id: intent.id, operation: intent.operation, targetResourceIds: [...intent.targetResourceIds], dataClass: intent.dataClass, externalEffect: intent.externalEffect, reversible: intent.reversible, bounded: intent.bounded };
}
export function redactForCore<T>(value: T): T { return JSON.parse(JSON.stringify(value).replaceAll("L3_TEST_SECRET_DO_NOT_LEAK", "[REDACTED]")) as T; }
```

```ts
// tests/helpers/no-effect-doubles.ts
export class NoEffectExecutor { executeNeverAvailable(): never { throw new Error("effects disabled in L3 refusal slice"); } }
export class NoEffectVaultGateway { decryptNeverAvailable(): never { throw new Error("vault plaintext disabled in L3 refusal slice"); } }
export class NoEffectProcessSupervisor { startNeverAvailable(): never { throw new Error("processes disabled in L3 refusal slice"); } }
class FakePath { normalizeLogicalIds(ids: readonly string[]): readonly string[] { return [...ids]; } }
export class FakeWindowsPorts { readonly path = new FakePath(); }
export class FakeMacPorts { readonly path = new FakePath(); }
```

- [ ] **Step 4: Verify redaction and no-effect behavior.**

Run: `npm run typecheck && npm run test -- tests/redaction/redactor.test.ts tests/ports/no-effect-doubles.test.ts`

Expected: both exit 0; the sentinel and opaque Vault reference are absent and all effectful doubles throw.

- [ ] **Step 5: Commit the boundary enforcement.**

```bash
git add src/redaction tests/redaction tests/ports tests/helpers
git commit -m "feat: add redaction and no-effect test ports"
```

**Acceptance:** Runtime and Core payload construction is allow-list based; host fakes require no Windows/macOS API and the test suite detects any accidental effect attempt.

## Task 4: Build the deterministic fake Runtime and role-vote collector

**Files:**
- Create: `src/policy/static-policy-registry.ts`
- Create: `src/governance/fake-runtime-adapter.ts`
- Create: `src/governance/orchestrator.ts`
- Test: `tests/governance/orchestrator.test.ts`

**Interfaces:**
- Consumes: `ValidatedIntent`, `GovernanceVote`, `GovernanceRole`, `RuntimeAdapter`, and `redactIntentForRuntime`.
- Produces: `P0_POLICY_VERSION`, `FakeRuntimeAdapter`, and `collectVotes(adapter: RuntimeAdapter, intent: ValidatedIntent): Promise<readonly GovernanceVote[]>`.

- [ ] **Step 1: Write failing orchestration tests.**

```ts
import { expect, it } from "vitest";
import { FakeRuntimeAdapter } from "../../src/governance/fake-runtime-adapter.js";
import { collectVotes } from "../../src/governance/orchestrator.js";
const valid = { intent: { id: "intent-1", operation: "publish", targetResourceIds: ["resource:one"], dataClass: "credential" as const, externalEffect: true, reversible: false, bounded: true, userDescription: "L3_TEST_SECRET_DO_NOT_LEAK" }, digest: "a".repeat(64) };
it("sends one redacted brief per role and retains a deterministic rejection", async () => {
  const adapter = new FakeRuntimeAdapter({ safety: { decision: "reject", reason: "policy blocks credential-bearing external operation" } });
  const votes = await collectVotes(adapter, valid);
  expect(votes).toHaveLength(3);
  expect(votes.find((vote) => vote.role === "safety")?.decision).toBe("reject");
  expect(JSON.stringify(adapter.receivedBriefs)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
});
```

- [ ] **Step 2: Run the focused test to verify it fails.**

Run: `npm run test -- tests/governance/orchestrator.test.ts`

Expected: FAIL because Runtime collection is absent.

- [ ] **Step 3: Implement the fixture-only adapter and collector.**

```ts
// src/policy/static-policy-registry.ts
export const P0_POLICY_VERSION = "p0-2026-08-16";
```

```ts
// src/governance/orchestrator.ts
import type { ValidatedIntent, GovernanceRole, GovernanceVote } from "../contracts/domain.js";
import type { RuntimeAdapter } from "../contracts/ports.js";
import { P0_POLICY_VERSION } from "../policy/static-policy-registry.js";
import { redactIntentForRuntime } from "../redaction/redactor.js";
const roles: readonly GovernanceRole[] = ["planner", "safety", "recovery"];
export async function collectVotes(adapter: RuntimeAdapter, intent: ValidatedIntent): Promise<readonly GovernanceVote[]> {
  return Promise.all(roles.map(async (role) => adapter.request({ role, actionDigest: intent.digest, policyVersion: P0_POLICY_VERSION, intent: redactIntentForRuntime(intent.intent) }) as Promise<GovernanceVote>));
}
```

`FakeRuntimeAdapter.request` must append each input to a public `receivedBriefs` array and return a complete fixed `GovernanceVote` for its requested role, defaulting to `approve` unless the constructor receives that role's `{ decision, reason }` override. It must not import `child_process`, `fetch`, or any Harness package.

```ts
// src/governance/fake-runtime-adapter.ts
import type { GovernanceRole, VoteDecision } from "../contracts/domain.js";
import type { RuntimeAdapter } from "../contracts/ports.js";
type VoteFixture = { decision?: VoteDecision; reason?: string; actionDigest?: string; policyVersion?: string; missing?: true; malformed?: true; throws?: true };
export class FakeRuntimeAdapter implements RuntimeAdapter {
  readonly receivedBriefs: Array<Readonly<{ role: GovernanceRole; actionDigest: string; policyVersion: string; intent: Record<string, unknown> }>> = [];
  constructor(private readonly fixtures: Partial<Record<GovernanceRole, VoteFixture>> = {}) {}
  async request(brief: Readonly<{ role: GovernanceRole; actionDigest: string; policyVersion: string; intent: Record<string, unknown> }>): Promise<unknown> {
    this.receivedBriefs.push(brief); const fixture = this.fixtures[brief.role] ?? {};
    if (fixture.throws) throw new Error("fake Runtime unavailable");
    if (fixture.missing) return undefined;
    if (fixture.malformed) return { role: brief.role, decision: "unknown" };
    return { role: brief.role, decision: fixture.decision ?? "approve", actionDigest: fixture.actionDigest ?? brief.actionDigest, policyVersion: fixture.policyVersion ?? brief.policyVersion, issuedAt: "2026-08-16T00:00:00.000Z", reason: fixture.reason ?? "fixture approval", evidenceRefs: [`evidence:${brief.role}`] };
  }
}
```

- [ ] **Step 4: Verify three brief collection.**

Run: `npm run typecheck && npm run test -- tests/governance/orchestrator.test.ts`

Expected: both exit 0; exactly Planner, Safety, and Recovery are requested with matching digest/policy version and a deterministic Safety rejection.

- [ ] **Step 5: Commit governance evidence collection.**

```bash
git add src/policy src/governance tests/governance
git commit -m "feat: collect deterministic L3 governance votes"
```

**Acceptance:** The collector has no authorization decision and no side effect; it only obtains three redacted role results through the port.

## Task 5: Persist a complete redacted refusal and recovery packet

**Files:**
- Create: `src/refusal-packet/build-refusal-packet.ts`
- Create: `src/public-ledger/in-memory-ledger.ts`
- Test: `tests/refusal-packet/build-refusal-packet.test.ts`
- Test: `tests/public-ledger/in-memory-ledger.test.ts`

**Interfaces:**
- Consumes: `ValidatedIntent`, `GovernanceVote`, `RefusalPacket`, `DecisionRecord`, `DecisionLedger`, `P0_POLICY_VERSION`, and `redactForCore`.
- Produces: `buildRefusalPacket(intent: ValidatedIntent, votes: readonly GovernanceVote[]): RefusalPacket` and `InMemoryLedger` implementing `DecisionLedger`.

- [ ] **Step 1: Write failing packet and export tests.**

```ts
import { expect, it } from "vitest";
import { buildRefusalPacket } from "../../src/refusal-packet/build-refusal-packet.js";
import { InMemoryLedger } from "../../src/public-ledger/in-memory-ledger.js";
it("contains simulation, rollback limit, alternative, vote evidence, and no sentinel secret", () => {
  const packet = buildRefusalPacket({ intent: { id: "intent-1", operation: "publish", targetResourceIds: ["resource:one"], dataClass: "credential", externalEffect: true, reversible: false, bounded: true, userDescription: "L3_TEST_SECRET_DO_NOT_LEAK" }, digest: "a".repeat(64) }, [{ role: "safety", decision: "reject", actionDigest: "a".repeat(64), policyVersion: "p0-2026-08-16", issuedAt: "2026-08-16T00:00:00.000Z", reason: "reject", evidenceRefs: ["evidence:1"] }]);
  const ledger = new InMemoryLedger(); ledger.append({ actionDigest: packet.actionDigest, level: "L3", state: packet.state, policyVersion: packet.policyVersion, packet });
  expect(packet.simulation.sideEffects).toBe("none");
  expect(packet.rollback.reliabilityStopsAt).not.toBe("");
  expect(packet.alternatives.length).toBeGreaterThan(0);
  expect(ledger.getRefusalPacket(packet.actionDigest)).toEqual(packet);
  expect(JSON.stringify(ledger.exportRecords())).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
});
```

- [ ] **Step 2: Run the focused tests to verify they fail.**

Run: `npm run test -- tests/refusal-packet/build-refusal-packet.test.ts tests/public-ledger/in-memory-ledger.test.ts`

Expected: FAIL because packet construction and ledger do not exist.

- [ ] **Step 3: Implement the fixed recovery content and append-only ledger.**

```ts
// src/refusal-packet/build-refusal-packet.ts
export function buildRefusalPacket(intent: ValidatedIntent, votes: readonly GovernanceVote[]): RefusalPacket {
  return { actionDigest: intent.digest, policyVersion: P0_POLICY_VERSION, state: "RefusedPendingSovereignty", simulation: { targetScope: intent.intent.targetResourceIds, sideEffects: "none" }, rollback: { recipe: ["No external request was sent.", "Discard the local synthetic intent if the user chooses."], reliabilityStopsAt: "No mutation was attempted, so rollback has no execution boundary." }, alternatives: [{ kind: "draft-only", summary: "Prepare a local draft without credentials or external delivery." }, { kind: "user-executed", summary: "Show the target scope and let the user perform the operation outside JARVIS." }], votes, waitingMessage: "RefusedPendingSovereignty: resolve every L3 rejection before any sovereign-key ceremony." };
}
```

`InMemoryLedger.append` must push only `redactForCore(record)` to a private array; `getRefusalPacket` finds by digest; `exportRecords` returns a deep-cloned readonly snapshot so callers cannot mutate stored evidence.

```ts
// src/public-ledger/in-memory-ledger.ts
import type { DecisionLedger } from "../contracts/ports.js";
import type { DecisionRecord, RefusalPacket } from "../contracts/domain.js";
import { redactForCore } from "../redaction/redactor.js";
export class InMemoryLedger implements DecisionLedger {
  private readonly records: DecisionRecord[] = [];
  append(record: DecisionRecord): void { this.records.push(redactForCore(record)); }
  getRefusalPacket(actionDigest: string): RefusalPacket | undefined { return this.records.find((record) => record.actionDigest === actionDigest)?.packet; }
  exportRecords(): readonly DecisionRecord[] { return JSON.parse(JSON.stringify(this.records)) as DecisionRecord[]; }
}
```

- [ ] **Step 4: Verify Core export and packet completeness.**

Run: `npm run typecheck && npm run test -- tests/refusal-packet/build-refusal-packet.test.ts tests/public-ledger/in-memory-ledger.test.ts`

Expected: both exit 0; a persisted packet has no secrets and includes every field required by baseline acceptance criterion 4.

- [ ] **Step 5: Commit the refusal evidence path.**

```bash
git add src/refusal-packet src/public-ledger tests/refusal-packet tests/public-ledger
git commit -m "feat: persist redacted L3 refusal packets"
```

**Acceptance:** Ledger export is non-secret and a UI can query a packet without touching Runtime, Vault, or an executor.

## Task 6: Implement the Authority Kernel's fail-closed refusal transition

**Files:**
- Create: `src/authority/authority-kernel.ts`
- Test: `tests/authority/authority-kernel.test.ts`

**Interfaces:**
- Consumes: `validateAndDigest`, `classify`, `collectVotes`, `buildRefusalPacket`, `DecisionLedger`, `RuntimeAdapter`, `EffectExecutor`, `VaultGateway`, and `SovereignAuthorization`.
- Produces: `AuthorityKernel.submit(intent: ActionIntent, authorization?: SovereignAuthorization): Promise<DecisionRecord>` and `hasExecutionCapability(): false`.

- [ ] **Step 1: Write failing state-machine and forged-key tests.**

```ts
import { expect, it } from "vitest";
import { AuthorityKernel } from "../../src/authority/authority-kernel.js";
import { InMemoryLedger } from "../../src/public-ledger/in-memory-ledger.js";
import { FakeRuntimeAdapter } from "../../src/governance/fake-runtime-adapter.js";
import { NoEffectExecutor, NoEffectVaultGateway } from "../helpers/no-effect-doubles.js";
it("refuses one rejecting L3 vote and never calls effects even with a forged sovereign authorization", async () => {
  const kernel = new AuthorityKernel(new InMemoryLedger(), new FakeRuntimeAdapter({ recovery: { decision: "reject", reason: "rollback unavailable" } }), new NoEffectExecutor(), new NoEffectVaultGateway());
  const record = await kernel.submit({ id: "intent-1", operation: "publish", targetResourceIds: ["resource:one"], dataClass: "credential", externalEffect: true, reversible: false, bounded: true, userDescription: "L3_TEST_SECRET_DO_NOT_LEAK" }, { actionDigest: "forged", policyVersion: "p0-2026-08-16", expiresAt: "2099-01-01T00:00:00.000Z", deviceContext: "fake", requestedCapability: "execute", proof: "forged" });
  expect(record).toMatchObject({ level: "L3", state: "RefusedPendingSovereignty" });
  expect(kernel.hasExecutionCapability()).toBe(false);
});
```

- [ ] **Step 2: Run the focused test to verify it fails.**

Run: `npm run test -- tests/authority/authority-kernel.test.ts`

Expected: FAIL because the Authority Kernel is absent.

- [ ] **Step 3: Implement only the refusal branch.**

```ts
// src/authority/authority-kernel.ts
export class AuthorityKernel {
  constructor(private readonly ledger: DecisionLedger, private readonly runtime: RuntimeAdapter, private readonly executor: EffectExecutor, private readonly vault: VaultGateway) {}
  hasExecutionCapability(): false { return false; }
  async submit(intent: ActionIntent, _authorization?: SovereignAuthorization): Promise<DecisionRecord> {
    const validated = validateAndDigest(intent); const level = classify(validated.intent);
    if (level !== "L3") throw new Error("P0 refusal slice accepts only L3 test intents");
    const votes = await collectVotes(this.runtime, validated);
    const packet = buildRefusalPacket(validated, votes);
    const record: DecisionRecord = { actionDigest: validated.digest, level, state: "RefusedPendingSovereignty", policyVersion: packet.policyVersion, packet };
    this.ledger.append(record); return record;
  }
}
```

The implementation must not call `executor`, `vault`, or an authorization verifier. A later, separately approved slice owns the unanimous-approval branch and may add a capability type; it must not alter this task's refusal semantics.

- [ ] **Step 4: Verify the fail-closed transition.**

Run: `npm run typecheck && npm run test -- tests/authority/authority-kernel.test.ts`

Expected: both exit 0; a forged authorization changes neither state nor capability availability.

- [ ] **Step 5: Commit the kernel refusal path.**

```bash
git add src/authority tests/authority
git commit -m "feat: fail closed to JARVIS L3 refusal"
```

**Acceptance:** The only implemented state transition is `Draft → Classified → L3Voting → RefusedPendingSovereignty`; execution capability is structurally impossible.

## Task 7: Add full-slice acceptance, secret-negative, and portable-host tests

**Files:**
- Create: `tests/integration/l3-refusal-slice.test.ts`
- Create: `tests/integration/portable-host-ports.test.ts`

**Interfaces:**
- Consumes: all Task 1–6 public interfaces and `FakeWindowsPorts`/`FakeMacPorts`.
- Produces: executable evidence for all eight architecture-baseline acceptance criteria that are in scope for a no-side-effect refusal slice.

- [ ] **Step 1: Write the failing end-to-end acceptance test.**

```ts
import { expect, it } from "vitest";
import { AuthorityKernel } from "../../src/authority/authority-kernel.js";
import { InMemoryLedger } from "../../src/public-ledger/in-memory-ledger.js";
import { FakeRuntimeAdapter } from "../../src/governance/fake-runtime-adapter.js";
import { NoEffectExecutor, NoEffectVaultGateway } from "../helpers/no-effect-doubles.js";
it("records a redacted recovery packet for every reject-like governance failure", async () => {
  for (const fixture of [{ decision: "reject" as const }, { missing: true as const }, { decision: "approve" as const, actionDigest: "b".repeat(64) }]) {
    const ledger = new InMemoryLedger();
    const runtime = new FakeRuntimeAdapter({ planner: fixture });
    const record = await new AuthorityKernel(ledger, runtime, new NoEffectExecutor(), new NoEffectVaultGateway()).submit({ id: "intent-1", operation: "publish", targetResourceIds: ["resource:one"], dataClass: "credential", externalEffect: true, reversible: false, bounded: true, vaultRef: "vault:secret", userDescription: "L3_TEST_SECRET_DO_NOT_LEAK" });
    expect(record.state).toBe("RefusedPendingSovereignty");
    expect(JSON.stringify(ledger.exportRecords())).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
    expect(JSON.stringify(runtime.receivedBriefs)).not.toContain("vault:secret");
  }
});
```

- [ ] **Step 2: Run all integration tests to verify they fail.**

Run: `npm run test -- tests/integration/l3-refusal-slice.test.ts tests/integration/portable-host-ports.test.ts`

Expected: FAIL until the fake Runtime represents missing/malformed/mismatched/stale results as refusal inputs and the portable test is added.

- [ ] **Step 3: Tighten schema validation and add the portable execution matrix.**

```ts
// tests/integration/portable-host-ports.test.ts
import { expect, it } from "vitest";
import { FakeMacPorts, FakeWindowsPorts } from "../helpers/no-effect-doubles.js";
it.each([new FakeWindowsPorts(), new FakeMacPorts()])("normalizes logical IDs without a platform path (%s)", (host) => {
  expect(host.path.normalizeLogicalIds(["resource:one"])).toEqual(["resource:one"]);
});
```

Update `collectVotes` to reject a result unless it is an object with exactly a permitted role, `approve` or `reject` decision, a 64-character digest equal to the submitted digest, `P0_POLICY_VERSION`, a parseable ISO timestamp, non-empty reason, and an array of `evidenceRefs`. On any adapter exception or invalid result, return a synthetic redacted `reject` vote for that role with reason `runtime result unavailable or invalid`; do not throw out of the refusal path.

```ts
// src/governance/orchestrator.ts (replace the Task 4 version)
import type { GovernanceRole, GovernanceVote, ValidatedIntent } from "../contracts/domain.js";
import type { RuntimeAdapter } from "../contracts/ports.js";
import { P0_POLICY_VERSION } from "../policy/static-policy-registry.js";
import { redactIntentForRuntime } from "../redaction/redactor.js";
const roles: readonly GovernanceRole[] = ["planner", "safety", "recovery"];
const isRole = (value: unknown): value is GovernanceRole => value === "planner" || value === "safety" || value === "recovery";
function invalid(role: GovernanceRole, actionDigest: string): GovernanceVote {
  return { role, decision: "reject", actionDigest, policyVersion: P0_POLICY_VERSION, issuedAt: "2026-08-16T00:00:00.000Z", reason: "runtime result unavailable or invalid", evidenceRefs: [] };
}
function valid(value: unknown, expectedRole: GovernanceRole, actionDigest: string): GovernanceVote | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const vote = value as Record<string, unknown>;
  if (!isRole(vote.role) || vote.role !== expectedRole || (vote.decision !== "approve" && vote.decision !== "reject") || vote.actionDigest !== actionDigest || vote.policyVersion !== P0_POLICY_VERSION || typeof vote.issuedAt !== "string" || Number.isNaN(Date.parse(vote.issuedAt)) || typeof vote.reason !== "string" || vote.reason.length === 0 || !Array.isArray(vote.evidenceRefs) || !vote.evidenceRefs.every((ref) => typeof ref === "string")) return undefined;
  return vote as unknown as GovernanceVote;
}
export async function collectVotes(adapter: RuntimeAdapter, intent: ValidatedIntent): Promise<readonly GovernanceVote[]> {
  return Promise.all(roles.map(async (role) => {
    try { return valid(await adapter.request({ role, actionDigest: intent.digest, policyVersion: P0_POLICY_VERSION, intent: redactIntentForRuntime(intent.intent) }), role, intent.digest) ?? invalid(role, intent.digest); }
    catch { return invalid(role, intent.digest); }
  }));
}
```

- [ ] **Step 4: Run the complete verification gate.**

Run: `npm run typecheck && npm run test:all`

Expected: both exit 0. Tests cover external/credential L3 classification, three equally bound redacted briefs, reject/missing/malformed/mismatched/stale/Runtime-failure refusal, packet persistence, no effectful port use, forged-key non-bypass, Core/brief sentinel absence, and fake Windows/macOS portability.

- [ ] **Step 5: Commit the acceptance evidence.**

```bash
git add tests/integration src/governance/orchestrator.ts
git commit -m "test: verify JARVIS L3 refusal slice boundaries"
```

**Acceptance:** One command proves the vertical slice never crosses from refusal into authorization or an effect, including when inputs are adversarial or Runtime evidence is invalid.

## Dependency order and parallelism

1. Task 1 is the contract/runner gate and must merge first.
2. After Task 1, **Task 2** (`src/action-intent/**`, `tests/action-intent/**`) and **Task 3** (`src/redaction/**`, `tests/redaction/**`, `tests/ports/**`, `tests/helpers/**`) can run in parallel with no overlapping paths.
3. After Tasks 2–3, **Task 4** and **Task 5** can run in parallel. They have disjoint production/test paths and consume only frozen contracts; Task 5 receives votes as data and does not import the orchestrator.
4. Task 6 follows Tasks 2, 4, and 5. Task 7 follows Task 6 and is the final cross-cutting acceptance gate.

## Review checklist before implementation handoff

- [ ] The scope contains only a refusal packet; no success authorization or executor work is smuggled in.
- [ ] Every non-effect and redaction requirement in the architecture baseline has a named automated test above.
- [ ] All code paths discussed use the exact frozen interfaces and imports in this plan.
- [ ] No code step asks an engineer to choose an unspecified model, Runtime release, secret store, desktop framework, or external service.
- [ ] `git diff --check`, `npm run typecheck`, and `npm run test:all` are clean before presenting the implementation for review.

## Deferred explicitly

- Real DeepSeek Harness process lifecycle, protocol compatibility, pinned distribution, and JSON-RPC integration.
- Any model provider, API key, credentials, network client, external account, or external executor.
- Native Windows/macOS secure-key, path-policy, process-supervisor, desktop-interaction, Vault storage, decrypt, user-presence, recovery, and revocation implementations.
- L0/L1/L2 approval paths, L3 unanimous approval, capability issuance, key ceremony, execution, rollback execution, and persistence beyond the in-memory test ledger.

Plan complete and saved to `docs/superpowers/plans/2026-08-16-jarvis-p0-l3-refusal-slice.md`. Implementation should proceed task-by-task using the declared review gates.
