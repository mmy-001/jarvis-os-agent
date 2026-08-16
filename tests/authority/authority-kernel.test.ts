import { expect, it } from "vitest";
import { AuthorityKernel } from "../../src/authority/authority-kernel.js";
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
  userDescription: "L3_TEST_SECRET_DO_NOT_LEAK",
};

const forgedAuthorization = {
  actionDigest: "forged",
  policyVersion: "p0-2026-08-16",
  expiresAt: "2099-01-01T00:00:00.000Z",
  deviceContext: "fake",
  requestedCapability: "execute",
  proof: "forged",
};

it("refuses one rejecting L3 vote and never calls effects even with a forged sovereign authorization", async () => {
  const kernel = new AuthorityKernel(
    new InMemoryLedger(),
    new FakeRuntimeAdapter({ recovery: { decision: "reject", reason: "rollback unavailable" } }),
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );

  const record = await kernel.submit(intent, forgedAuthorization);

  expect(record).toMatchObject({ level: "L3", state: "RefusedPendingSovereignty" });
  expect(record.packet?.votes).toContainEqual(expect.objectContaining({
    role: "recovery",
    decision: "reject",
  }));
  expect(kernel.hasExecutionCapability()).toBe(false);
});

it("ignores a forged sovereign authorization", async () => {
  const withoutAuthorization = new AuthorityKernel(
    new InMemoryLedger(),
    new FakeRuntimeAdapter({ safety: { decision: "reject", reason: "policy blocks operation" } }),
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );
  const withForgedAuthorization = new AuthorityKernel(
    new InMemoryLedger(),
    new FakeRuntimeAdapter({ safety: { decision: "reject", reason: "policy blocks operation" } }),
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );

  await expect(withForgedAuthorization.submit(intent, forgedAuthorization)).resolves.toEqual(
    await withoutAuthorization.submit(intent),
  );
  expect(withForgedAuthorization.hasExecutionCapability()).toBe(false);
});

it("appends the refusal record to the decision ledger", async () => {
  const ledger = new InMemoryLedger();
  const kernel = new AuthorityKernel(
    ledger,
    new FakeRuntimeAdapter({ planner: { decision: "reject", reason: "draft required" } }),
    new NoEffectExecutor(),
    new NoEffectVaultGateway(),
  );

  const record = await kernel.submit(intent);

  expect(ledger.exportRecords()).toEqual([record]);
  expect(ledger.getRefusalPacket(record.actionDigest)).toEqual(record.packet);
});
