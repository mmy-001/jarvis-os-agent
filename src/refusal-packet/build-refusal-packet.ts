import type { GovernanceVote, RefusalPacket, ValidatedIntent } from "../contracts/domain.js";
import { P0_POLICY_VERSION } from "../policy/static-policy-registry.js";
import { redactForCore } from "../redaction/redactor.js";

export function buildRefusalPacket(
  intent: ValidatedIntent,
  votes: readonly GovernanceVote[],
): RefusalPacket {
  return redactForCore({
    actionDigest: intent.digest,
    policyVersion: P0_POLICY_VERSION,
    state: "RefusedPendingSovereignty",
    simulation: {
      targetScope: [...intent.intent.targetResourceIds],
      sideEffects: "none",
    },
    rollback: {
      recipe: [
        "No external request was sent.",
        "Discard the local synthetic intent if the user chooses.",
      ],
      reliabilityStopsAt: "No mutation was attempted, so rollback has no execution boundary.",
    },
    alternatives: [
      {
        kind: "draft-only",
        summary: "Prepare a local draft without credentials or external delivery.",
      },
      {
        kind: "user-executed",
        summary: "Show the target scope and let the user perform the operation outside JARVIS.",
      },
    ],
    votes,
    waitingMessage: "RefusedPendingSovereignty: resolve every L3 rejection before any sovereign-key ceremony.",
  });
}
