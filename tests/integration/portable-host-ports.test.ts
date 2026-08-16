import { expect, it } from "vitest";
import { AuthorityKernel } from "../../src/authority/authority-kernel.js";
import { submitL3RefusalThroughHost } from "../../src/composition/submit-l3-refusal.js";
import { FakeRuntimeAdapter } from "../../src/governance/fake-runtime-adapter.js";
import { InMemoryLedger } from "../../src/public-ledger/in-memory-ledger.js";
import { FakeMacPorts, FakeWindowsPorts } from "../helpers/no-effect-doubles.js";
import { NoEffectExecutor, NoEffectVaultGateway } from "../helpers/no-effect-doubles.js";

it.each([new FakeWindowsPorts(), new FakeMacPorts()])(
  "normalizes logical IDs without a platform path (%s)",
  (host) => {
    expect(host.localPathPolicy.normalizeLogicalIds(["resource:one"])).toEqual(["resource:one"]);
  },
);

it("runs equivalent Core refusal flows through complete Windows and macOS fake host bundles", async () => {
  const packets = await Promise.all([new FakeWindowsPorts(), new FakeMacPorts()].map(async (host) => {
    const record = await new AuthorityKernel(
      new InMemoryLedger(),
      new FakeRuntimeAdapter({ safety: { decision: "reject" } }),
      new NoEffectExecutor(),
      new NoEffectVaultGateway(),
    ).submit({
      id: "intent-1",
      operation: "publish",
      targetResourceIds: ["resource:one"],
      dataClass: "credential",
      externalEffect: true,
      reversible: false,
      bounded: true,
      userDescription: "portable refusal",
    });

    host.desktopInteraction.showReadOnlyPacket(record.packet!);

    expect(host.secureKeyStore.callCount).toBe(0);
    expect(host.processSupervisor.callCount).toBe(0);
    expect(host.desktopInteraction.packets).toEqual([record.packet]);
    expect(host.localPathPolicy.normalizeLogicalIds(["resource:one"])).toEqual(["resource:one"]);
    return record.packet;
  }));

  expect(packets[0]).toEqual(packets[1]);
});

it("composes equivalent Windows and macOS normalization, refusal, and read-only presentation", async () => {
  const records = await Promise.all([new FakeWindowsPorts(), new FakeMacPorts()].map(async (host) => {
    const kernel = new AuthorityKernel(
      new InMemoryLedger(),
      new FakeRuntimeAdapter({ safety: { decision: "reject" } }),
      new NoEffectExecutor(),
      new NoEffectVaultGateway(),
    );

    const record = await submitL3RefusalThroughHost(host, kernel, {
      id: "intent-1",
      operation: "publish",
      targetResourceIds: ["resource:one"],
      dataClass: "credential",
      externalEffect: true,
      reversible: false,
      bounded: true,
      userDescription: "portable composition",
    });

    expect(host.localPathPolicy.callCount).toBe(1);
    expect(host.desktopInteraction.packets).toEqual([record.packet]);
    expect(host.secureKeyStore.callCount).toBe(0);
    expect(host.processSupervisor.callCount).toBe(0);
    return record;
  }));

  expect(records[0]).toEqual(records[1]);
});
