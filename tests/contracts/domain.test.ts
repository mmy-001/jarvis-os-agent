import { describe, expect, it } from "vitest";
import type { RefusalPacket, SovereignAuthorization } from "../../src/contracts/domain.js";

type IsExactly<Actual, Expected> = [Actual] extends [Expected]
  ? [Expected] extends [Actual]
    ? true
    : false
  : false;
type Assert<Type extends true> = Type;
type SovereignAuthorizationIsFutureDataOnly = Assert<
  IsExactly<SovereignAuthorization, {
    actionDigest: string;
    policyVersion: string;
    expiresAt: string;
    deviceContext: string;
    requestedCapability: string;
    proof: string;
  }>
>;

describe("P0 domain contract", () => {
  it("keeps the refusal packet Core-safe and explicitly non-effecting", () => {
    const packet: RefusalPacket = {
      actionDigest: "a".repeat(64),
      policyVersion: "p0-2026-08-16",
      state: "RefusedPendingSovereignty",
      simulation: { targetScope: ["resource:one"], sideEffects: "none" },
      rollback: {
        recipe: ["No execution occurred."],
        reliabilityStopsAt: "No mutation was attempted.",
      },
      alternatives: [{ kind: "draft-only", summary: "Create a local draft for the user." }],
      votes: [],
      waitingMessage: "Refused; sovereign-key action is not available until unanimous approval.",
    };

    expect(packet.simulation.sideEffects).toBe("none");
  });
});
