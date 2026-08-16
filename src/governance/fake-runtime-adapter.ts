import type { GovernanceRole, VoteDecision } from "../contracts/domain.js";
import type { RuntimeAdapter } from "../contracts/ports.js";

type VoteFixture = {
  decision?: VoteDecision;
  reason?: string;
  actionDigest?: string;
  policyVersion?: string;
  missing?: true;
  malformed?: true;
  throws?: true;
};

type RuntimeBrief = Readonly<{
  role: GovernanceRole;
  actionDigest: string;
  policyVersion: string;
  intent: Record<string, unknown>;
}>;

export class FakeRuntimeAdapter implements RuntimeAdapter {
  readonly receivedBriefs: RuntimeBrief[] = [];

  constructor(private readonly fixtures: Partial<Record<GovernanceRole, VoteFixture>> = {}) {}

  async request(brief: RuntimeBrief): Promise<unknown> {
    this.receivedBriefs.push(brief);
    const fixture = this.fixtures[brief.role] ?? {};

    if (fixture.throws) throw new Error("fake Runtime unavailable");
    if (fixture.missing) return undefined;
    if (fixture.malformed) return { role: brief.role, decision: "unknown" };

    return {
      role: brief.role,
      decision: fixture.decision ?? "approve",
      actionDigest: fixture.actionDigest ?? brief.actionDigest,
      policyVersion: fixture.policyVersion ?? brief.policyVersion,
      issuedAt: "2026-08-16T00:00:00.000Z",
      reason: fixture.reason ?? "fixture approval",
      evidenceRefs: [`evidence:${brief.role}`],
    };
  }
}
