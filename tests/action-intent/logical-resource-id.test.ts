import { describe, expect, it } from "vitest";
import * as logicalResourceId from "../../src/action-intent/logical-resource-id.js";
import { validateAndDigest } from "../../src/action-intent/canonicalize.js";
import { AuthorityKernel } from "../../src/authority/authority-kernel.js";
import { submitL3RefusalThroughHost } from "../../src/composition/submit-l3-refusal.js";
import { FakeRuntimeAdapter } from "../../src/governance/fake-runtime-adapter.js";
import { InMemoryLedger } from "../../src/public-ledger/in-memory-ledger.js";
import {
  FakeMacPorts,
  FakeWindowsPorts,
  NoEffectExecutor,
  NoEffectVaultGateway,
} from "../helpers/no-effect-doubles.js";

const intent = {
  id: "intent-1",
  operation: "publish",
  targetResourceIds: ["resource:one"],
  dataClass: "credential" as const,
  externalEffect: true,
  reversible: false,
  bounded: true,
  userDescription: "logical resource boundary",
};

const dangerousResourceIds = [
  "resource:C:/Windows",
  "resource:C:Windows",
  "resource:z:relative",
  "resource:a:private",
  "resource:a/../../private",
  "resource:a\\..\\private",
  "resource:..",
  "resource:.",
  "resource:",
  "resource:a::private",
  "resource::private",
  "resource:a private",
  "resource:a\tprivate",
  "resource:a\u0000private",
  "resource:a%2Fprivate",
] as const;

describe("logical resource ID boundary", () => {
  it("declares the cross-platform reserved ambiguous first-namespace grammar", () => {
    const reservedAmbiguousSuffix = (
      logicalResourceId as { RESERVED_AMBIGUOUS_RESOURCE_SUFFIX?: RegExp }
    ).RESERVED_AMBIGUOUS_RESOURCE_SUFFIX;

    expect(reservedAmbiguousSuffix).toBeInstanceOf(RegExp);
    expect(reservedAmbiguousSuffix?.test("C:Windows")).toBe(true);
    expect(reservedAmbiguousSuffix?.test("z:relative")).toBe(true);
    expect(reservedAmbiguousSuffix?.test("project:private")).toBe(false);
    expect(reservedAmbiguousSuffix?.test("ns:a:private")).toBe(false);
  });

  it.each([
    "resource:one",
    "resource:namespace:leaf",
    "resource:vault:target-token",
    "resource:alpha.beta:leaf_1",
    "resource:ns:a:private",
  ])("accepts the logical namespace %s", (targetResourceId) => {
    expect(() => validateAndDigest({ ...intent, targetResourceIds: [targetResourceId] })).not.toThrow();
  });

  it.each(dangerousResourceIds)("rejects %j at the ActionIntent structural boundary", (targetResourceId) => {
    expect(() => validateAndDigest({ ...intent, targetResourceIds: [targetResourceId] }))
      .toThrow("invalid ActionIntent");
  });

  it("rejects a malformed ID through AuthorityKernel before Runtime or ledger activity", async () => {
    const ledger = new InMemoryLedger();
    const runtime = new FakeRuntimeAdapter();
    const kernel = new AuthorityKernel(ledger, runtime, new NoEffectExecutor(), new NoEffectVaultGateway());

    await expect(kernel.submit({ ...intent, targetResourceIds: ["resource:."] }))
      .rejects.toThrow("invalid ActionIntent");

    expect(runtime.receivedBriefs).toEqual([]);
    expect(ledger.exportRecords()).toEqual([]);
    expect(kernel.hasExecutionCapability()).toBe(false);
  });

  it.each(["resource:C:Windows", "resource:z:relative"])(
    "rejects a drive-relative ID through AuthorityKernel before Runtime or ledger activity",
    async (targetResourceId) => {
      const ledger = new InMemoryLedger();
      const runtime = new FakeRuntimeAdapter();
      const kernel = new AuthorityKernel(ledger, runtime, new NoEffectExecutor(), new NoEffectVaultGateway());

      await expect(kernel.submit({ ...intent, targetResourceIds: [targetResourceId] }))
        .rejects.toThrow("invalid ActionIntent");

      expect(runtime.receivedBriefs).toEqual([]);
      expect(ledger.exportRecords()).toEqual([]);
      expect(kernel.hasExecutionCapability()).toBe(false);
    },
  );

  it.each([new FakeWindowsPorts(), new FakeMacPorts()])(
    "rejects a malformed ID in the fake host before Core flow (%s)",
    async (host) => {
      const ledger = new InMemoryLedger();
      const runtime = new FakeRuntimeAdapter();
      const kernel = new AuthorityKernel(ledger, runtime, new NoEffectExecutor(), new NoEffectVaultGateway());

      await expect(submitL3RefusalThroughHost(host, kernel, {
        ...intent,
        targetResourceIds: ["resource:a/../../private"],
      })).rejects.toThrow("invalid logical resource ID");

      expect(host.localPathPolicy.callCount).toBe(1);
      expect(runtime.receivedBriefs).toEqual([]);
      expect(ledger.exportRecords()).toEqual([]);
      expect(host.desktopInteraction.packets).toEqual([]);
      expect(host.secureKeyStore.callCount).toBe(0);
      expect(host.processSupervisor.callCount).toBe(0);
    },
  );

  it.each([
    ["Windows", new FakeWindowsPorts(), "resource:C:Windows"],
    ["Windows", new FakeWindowsPorts(), "resource:z:relative"],
    ["macOS", new FakeMacPorts(), "resource:C:Windows"],
    ["macOS", new FakeMacPorts(), "resource:z:relative"],
  ])("rejects a drive-relative ID before the %s host reaches Core", async (
    _platform,
    host,
    targetResourceId,
  ) => {
    const ledger = new InMemoryLedger();
    const runtime = new FakeRuntimeAdapter();
    const kernel = new AuthorityKernel(ledger, runtime, new NoEffectExecutor(), new NoEffectVaultGateway());

    await expect(submitL3RefusalThroughHost(host, kernel, {
      ...intent,
      targetResourceIds: [targetResourceId],
    })).rejects.toThrow("invalid logical resource ID");

    expect(host.localPathPolicy.callCount).toBe(1);
    expect(runtime.receivedBriefs).toEqual([]);
    expect(ledger.exportRecords()).toEqual([]);
    expect(host.desktopInteraction.packets).toEqual([]);
    expect(host.secureKeyStore.callCount).toBe(0);
    expect(host.processSupervisor.callCount).toBe(0);
  });

  it("keeps fake Windows and macOS path policies independently typed with identical rejection semantics", () => {
    const windows = new FakeWindowsPorts().localPathPolicy;
    const mac = new FakeMacPorts().localPathPolicy;

    expect(windows).not.toBe(mac);
    expect(windows.constructor).not.toBe(mac.constructor);
    for (const targetResourceId of ["resource:C:Windows", "resource:z:relative", "resource:a/../../private"]) {
      expect(() => windows.normalizeLogicalIds([targetResourceId])).toThrow("invalid logical resource ID");
      expect(() => mac.normalizeLogicalIds([targetResourceId])).toThrow("invalid logical resource ID");
    }
  });
});
