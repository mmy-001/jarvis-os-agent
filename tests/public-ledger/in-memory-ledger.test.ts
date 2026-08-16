import { expect, it } from "vitest";
import { buildRefusalPacket } from "../../src/refusal-packet/build-refusal-packet.js";
import { InMemoryLedger } from "../../src/public-ledger/in-memory-ledger.js";

it("stores a redacted refusal packet and exports an independent snapshot", () => {
  const packet = buildRefusalPacket({
    intent: {
      id: "intent-1",
      operation: "publish",
      targetResourceIds: ["resource:one"],
      dataClass: "credential",
      externalEffect: true,
      reversible: false,
      bounded: true,
      userDescription: "L3_TEST_SECRET_DO_NOT_LEAK",
    },
    digest: "a".repeat(64),
  }, [{
    role: "safety",
    decision: "reject",
    actionDigest: "a".repeat(64),
    policyVersion: "p0-2026-08-16",
    issuedAt: "2026-08-16T00:00:00.000Z",
    reason: "L3_TEST_SECRET_DO_NOT_LEAK",
    evidenceRefs: ["evidence:1"],
  }]);
  const ledger = new InMemoryLedger();

  ledger.append({
    actionDigest: packet.actionDigest,
    level: "L3",
    state: packet.state,
    policyVersion: packet.policyVersion,
    packet,
  });
  const exported = ledger.exportRecords();

  expect(ledger.getRefusalPacket(packet.actionDigest)).toMatchObject({
    actionDigest: packet.actionDigest,
    votes: [{ reason: "[REDACTED]" }],
  });
  expect(JSON.stringify(exported)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");

  const mutableExport = exported as unknown as { packet?: { votes: { reason: string }[] } }[];
  mutableExport[0]!.packet!.votes[0]!.reason = "changed outside the ledger";
  expect(ledger.exportRecords()[0]?.packet?.votes[0]?.reason).toBe("[REDACTED]");
});

it("returns a refusal query snapshot that cannot mutate stored evidence", () => {
  const packet = buildRefusalPacket({
    intent: {
      id: "intent-1",
      operation: "publish",
      targetResourceIds: ["resource:one"],
      dataClass: "credential",
      externalEffect: true,
      reversible: false,
      bounded: true,
      userDescription: "L3_TEST_SECRET_DO_NOT_LEAK",
    },
    digest: "a".repeat(64),
  }, [{
    role: "safety",
    decision: "reject",
    actionDigest: "a".repeat(64),
    policyVersion: "p0-2026-08-16",
    issuedAt: "2026-08-16T00:00:00.000Z",
    reason: "reject",
    evidenceRefs: ["evidence:1"],
  }]);
  const ledger = new InMemoryLedger();
  ledger.append({
    actionDigest: packet.actionDigest,
    level: "L3",
    state: packet.state,
    policyVersion: packet.policyVersion,
    packet,
  });

  const queried = ledger.getRefusalPacket(packet.actionDigest);
  const mutableQuery = queried as unknown as {
    votes: { reason: string; evidenceRefs: string[] }[];
    alternatives: { summary: string }[];
    simulation: { targetScope: string[] };
  };
  mutableQuery.votes[0]!.reason = "changed outside the ledger";
  mutableQuery.votes[0]!.evidenceRefs[0] = "changed outside the ledger";
  mutableQuery.alternatives[0]!.summary = "changed outside the ledger";
  mutableQuery.simulation.targetScope[0] = "resource:changed";

  const queriedAgain = ledger.getRefusalPacket(packet.actionDigest);
  const exportedAgain = ledger.exportRecords()[0]?.packet;

  expect(queriedAgain?.votes[0]).toMatchObject({ reason: "reject", evidenceRefs: ["evidence:1"] });
  expect(queriedAgain?.alternatives[0]).toMatchObject({ summary: "Prepare a local draft without credentials or external delivery." });
  expect(queriedAgain?.simulation.targetScope).toEqual(["resource:one"]);
  expect(exportedAgain?.votes[0]).toMatchObject({ reason: "reject", evidenceRefs: ["evidence:1"] });
  expect(exportedAgain?.alternatives[0]).toMatchObject({ summary: "Prepare a local draft without credentials or external delivery." });
  expect(exportedAgain?.simulation.targetScope).toEqual(["resource:one"]);
});
