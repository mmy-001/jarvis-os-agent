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
