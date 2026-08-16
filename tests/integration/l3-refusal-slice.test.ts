import { expect, it } from "vitest";
import { AuthorityKernel } from "../../src/authority/authority-kernel.js";
import type { RuntimeAdapter } from "../../src/contracts/ports.js";
import { FakeRuntimeAdapter } from "../../src/governance/fake-runtime-adapter.js";
import { InMemoryLedger } from "../../src/public-ledger/in-memory-ledger.js";
import { NoEffectExecutor, NoEffectVaultGateway } from "../helpers/no-effect-doubles.js";

const intent = {
  id: "intent-1",
  operation: "publish",
  targetResourceIds: ["resource:one"],
  dataClass: "credential" as const,
  externalEffect: true,
  reversible: false,
  bounded: true,
  vaultRef: "vault:secret" as const,
  userDescription: "L3_TEST_SECRET_DO_NOT_LEAK",
};

const rejectLikeFixtures = [
  ["reject", { decision: "reject" as const }, false],
  ["missing", { missing: true as const }, true],
  ["malformed", { malformed: true as const }, true],
  ["digest mismatch", { actionDigest: "b".repeat(64) }, true],
  ["policy version mismatch", { policyVersion: "p0-stale" }, true],
  ["runtime throw", { throws: true as const }, true],
] as const;

it.each(rejectLikeFixtures)("persists a refusal for a %s governance result", async (
  _name,
  fixture,
  synthetic,
) => {
  const ledger = new InMemoryLedger();
  const runtime = new FakeRuntimeAdapter({ planner: fixture });
  const kernel = new AuthorityKernel(
    ledger,
    runtime,
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );

  const record = await kernel.submit(intent);

  expect(record).toMatchObject({ level: "L3", state: "RefusedPendingSovereignty" });
  const plannerVote = record.packet?.votes.find((vote) => vote.role === "planner");
  expect(plannerVote).toMatchObject({
    role: "planner",
    decision: "reject",
    actionDigest: record.actionDigest,
    policyVersion: record.policyVersion,
  });
  if (synthetic) {
    expect(plannerVote?.reason).toBe("runtime result unavailable or invalid");
  }
  expect(JSON.stringify(record)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(record)).not.toContain("vault:secret");
  expect(JSON.stringify(ledger.exportRecords())).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(ledger.exportRecords())).not.toContain("vault:secret");
  expect(JSON.stringify(runtime.receivedBriefs)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(runtime.receivedBriefs)).not.toContain("vault:secret");
});

it("refuses unanimous approvals even with a forged sovereign authorization", async () => {
  const kernel = new AuthorityKernel(
    new InMemoryLedger(),
    new FakeRuntimeAdapter(),
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );
  const record = await kernel.submit(intent, {
    actionDigest: "forged",
    policyVersion: "p0-2026-08-16",
    expiresAt: "2099-01-01T00:00:00.000Z",
    deviceContext: "fake",
    requestedCapability: "execute",
    proof: "forged",
  });

  expect(record).toMatchObject({ state: "RefusedPendingSovereignty" });
  expect(record.packet?.votes.every((vote) => vote.decision === "approve")).toBe(true);
  expect(kernel.hasExecutionCapability()).toBe(false);
});

it("turns an impossible UTC calendar date into a synthetic reject", async () => {
  const runtime: RuntimeAdapter = {
    async request(brief) {
      return {
        role: brief.role,
        decision: "approve",
        actionDigest: brief.actionDigest,
        policyVersion: brief.policyVersion,
        issuedAt: "2026-02-30T00:00:00.000Z",
        reason: "fixture approval",
        evidenceRefs: ["evidence:calendar"],
      };
    },
  };
  const record = await new AuthorityKernel(
    new InMemoryLedger(),
    runtime,
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  ).submit(intent);

  expect(record.packet?.votes).toContainEqual(expect.objectContaining({
    role: "planner",
    decision: "reject",
    actionDigest: record.actionDigest,
    policyVersion: record.policyVersion,
    reason: "runtime result unavailable or invalid",
  }));
});

it("binds every redacted brief to the same digest and policy version", async () => {
  const ledger = new InMemoryLedger();
  const runtime = new FakeRuntimeAdapter({ planner: { decision: "reject" } });
  const record = await new AuthorityKernel(
    ledger,
    runtime,
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  ).submit(intent);

  expect(runtime.receivedBriefs).toHaveLength(3);
  expect(new Set(runtime.receivedBriefs.map((brief) => brief.actionDigest))).toEqual(
    new Set([record.actionDigest]),
  );
  expect(new Set(runtime.receivedBriefs.map((brief) => brief.policyVersion))).toEqual(
    new Set([record.policyVersion]),
  );
  expect(ledger.getRefusalPacket(record.actionDigest)).toEqual(record.packet);
});

it("keeps contaminated Runtime vote fields out of packets, ledger exports, and JSON snapshots", async () => {
  const ledger = new InMemoryLedger();
  const runtime: RuntimeAdapter = {
    async request(brief) {
      return {
        role: brief.role,
        decision: "approve",
        actionDigest: brief.actionDigest,
        policyVersion: brief.policyVersion,
        issuedAt: "2026-08-16T00:00:00.000Z",
        reason: "vault:reason-token",
        evidenceRefs: ["L3_TEST_SECRET_DO_NOT_LEAK"],
        vaultRef: "vault:extra-reference",
      };
    },
  };
  const record = await new AuthorityKernel(
    ledger,
    runtime,
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  ).submit(intent);

  const serialized = JSON.stringify({
    record,
    packet: ledger.getRefusalPacket(record.actionDigest),
    exported: ledger.exportRecords(),
  });
  expect(record.packet?.votes).toEqual(expect.arrayContaining([
    expect.objectContaining({
      decision: "reject",
      reason: "runtime result unavailable or invalid",
      evidenceRefs: [],
    }),
  ]));
  expect(serialized).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(serialized).not.toContain("vault:");
  expect(serialized).not.toContain("vaultRef");
});

it("projects returned refusal packets and records through the Core-safe boundary", async () => {
  const ledger = new InMemoryLedger();
  const record = await new AuthorityKernel(
    ledger,
    new FakeRuntimeAdapter({ safety: { decision: "reject" } }),
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  ).submit({
    ...intent,
    targetResourceIds: ["resource:vault:target-token"],
    userDescription: "L3_TEST_SECRET_DO_NOT_LEAK",
  });

  const serialized = JSON.stringify({ record, packet: record.packet, exported: ledger.exportRecords() });
  expect(serialized).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(serialized).not.toContain("vault:");
  expect(serialized).not.toContain("vaultRef");
});

it.each([
  ["sparse target array", (() => new Array<string>(1))()],
  ["undefined target", [undefined]],
  ["empty resource suffix", ["resource:"]],
])("rejects %s before Runtime or ledger access", async (_name, targetResourceIds) => {
  const ledger = new InMemoryLedger();
  const runtime = new FakeRuntimeAdapter();
  const kernel = new AuthorityKernel(ledger, runtime, new NoEffectExecutor(), new NoEffectVaultGateway());

  await expect(kernel.submit({ ...intent, targetResourceIds } as unknown as typeof intent))
    .rejects.toThrow("invalid ActionIntent");

  expect(runtime.receivedBriefs).toEqual([]);
  expect(ledger.exportRecords()).toEqual([]);
});

it("rejects non-L3 inputs before collecting votes or appending a ledger record", async () => {
  const ledger = new InMemoryLedger();
  const runtime = new FakeRuntimeAdapter();
  const kernel = new AuthorityKernel(
    ledger,
    runtime,
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );

  await expect(kernel.submit({
    ...intent,
    dataClass: "public",
    externalEffect: false,
    reversible: true,
    bounded: true,
  })).rejects.toThrow("P0 refusal slice accepts only L3 test intents");

  expect(runtime.receivedBriefs).toEqual([]);
  expect(ledger.exportRecords()).toEqual([]);
  expect(kernel.hasExecutionCapability()).toBe(false);
});

it.each([
  ["unknown data class", { dataClass: "unrecognized" }],
  ["non-boolean external effect", { externalEffect: "false" }],
  ["non-boolean reversibility", { reversible: "true" }],
  ["non-boolean bounded flag", { bounded: 1 }],
])("normalizes %s conservatively to an L3 refusal", async (_name, riskOverride) => {
  const ledger = new InMemoryLedger();
  const runtime = new FakeRuntimeAdapter();
  const kernel = new AuthorityKernel(
    ledger,
    runtime,
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );

  const record = await kernel.submit({
    ...intent,
    dataClass: "public",
    externalEffect: false,
    reversible: true,
    bounded: true,
    ...riskOverride,
  } as unknown as typeof intent);

  expect(record).toMatchObject({ level: "L3", state: "RefusedPendingSovereignty" });
  expect(runtime.receivedBriefs).toHaveLength(3);
  expect(ledger.exportRecords()).toHaveLength(1);
});
