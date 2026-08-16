import { expect, it } from "vitest";
import { buildRefusalPacket } from "../../src/refusal-packet/build-refusal-packet.js";

it("contains simulation, rollback limit, alternatives, and vote evidence", () => {
  const votes = [{
    role: "safety" as const,
    decision: "reject" as const,
    actionDigest: "a".repeat(64),
    policyVersion: "p0-2026-08-16",
    issuedAt: "2026-08-16T00:00:00.000Z",
    reason: "reject",
    evidenceRefs: ["evidence:1"],
  }];

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
  }, votes);

  expect(packet).toMatchObject({
    actionDigest: "a".repeat(64),
    policyVersion: "p0-2026-08-16",
    state: "RefusedPendingSovereignty",
    simulation: { targetScope: ["resource:one"], sideEffects: "none" },
  });
  expect(packet.rollback.reliabilityStopsAt).not.toBe("");
  expect(packet.alternatives.length).toBeGreaterThan(0);
  expect(packet.votes).toEqual(votes);
});

it("redacts vote text before the packet reaches a ledger", () => {
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
    evidenceRefs: ["L3_TEST_SECRET_DO_NOT_LEAK"],
  }]);

  expect(JSON.stringify(packet)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(packet.votes).toMatchObject([{
    role: "safety",
    decision: "reject",
    actionDigest: "a".repeat(64),
    reason: "[REDACTED]",
    evidenceRefs: ["[REDACTED]"],
  }]);
});
