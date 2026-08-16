import { expect, it } from "vitest";
import { FakeRuntimeAdapter } from "../../src/governance/fake-runtime-adapter.js";
import type { RuntimeAdapter } from "../../src/contracts/ports.js";
import { collectVotes } from "../../src/governance/orchestrator.js";

const valid = {
  intent: {
    id: "intent-1",
    operation: "publish",
    targetResourceIds: ["resource:one"],
    dataClass: "credential" as const,
    externalEffect: true,
    reversible: false,
    bounded: true,
    userDescription: "L3_TEST_SECRET_DO_NOT_LEAK",
  },
  digest: "a".repeat(64),
};

it("sends one redacted brief per role and retains a deterministic rejection", async () => {
  const adapter = new FakeRuntimeAdapter({
    safety: {
      decision: "reject",
      reason: "policy blocks credential-bearing external operation",
    },
  });

  const votes = await collectVotes(adapter, valid);

  expect(votes).toHaveLength(3);
  expect(votes.find((vote) => vote.role === "safety")?.decision).toBe("reject");
  expect(JSON.stringify(adapter.receivedBriefs)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
});

it("requests exactly the fixed roles with the input digest and P0 policy version", async () => {
  const adapter = new FakeRuntimeAdapter();

  const votes = await collectVotes(adapter, valid);

  expect(adapter.receivedBriefs.map((brief) => brief.role)).toEqual([
    "planner",
    "safety",
    "recovery",
  ]);
  expect(
    adapter.receivedBriefs.map(({ role, actionDigest, policyVersion }) => ({
      role,
      actionDigest,
      policyVersion,
    })),
  ).toEqual([
    { role: "planner", actionDigest: valid.digest, policyVersion: "p0-2026-08-16" },
    { role: "safety", actionDigest: valid.digest, policyVersion: "p0-2026-08-16" },
    { role: "recovery", actionDigest: valid.digest, policyVersion: "p0-2026-08-16" },
  ]);
  expect(votes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        role: "planner",
        decision: "approve",
        actionDigest: valid.digest,
        policyVersion: "p0-2026-08-16",
      }),
      expect.objectContaining({
        role: "safety",
        decision: "approve",
        actionDigest: valid.digest,
        policyVersion: "p0-2026-08-16",
      }),
      expect.objectContaining({
        role: "recovery",
        decision: "approve",
        actionDigest: valid.digest,
        policyVersion: "p0-2026-08-16",
      }),
    ]),
  );
});

it("projects a Runtime vote into a fresh schema-only record", async () => {
  const adapter: RuntimeAdapter = {
    async request(brief) {
      return {
        role: brief.role,
        decision: "approve",
        actionDigest: brief.actionDigest,
        policyVersion: brief.policyVersion,
        issuedAt: "2026-08-16T00:00:00.000Z",
        reason: "substantive public evidence",
        evidenceRefs: ["evidence:public-review"],
        arbitraryRuntimeField: { cannot: "cross boundary" },
      };
    },
  };

  const votes = await collectVotes(adapter, valid);

  expect(votes).toEqual(expect.arrayContaining([
    expect.objectContaining({ role: "planner", decision: "approve" }),
  ]));
  expect(votes[0]).not.toHaveProperty("arbitraryRuntimeField");
  expect(Object.keys(votes[0] ?? {})).toEqual([
    "role",
    "decision",
    "actionDigest",
    "policyVersion",
    "issuedAt",
    "reason",
    "evidenceRefs",
  ]);
});

it("does not traverse an unused Runtime field while capturing vote schema data", async () => {
  let getterCalls = 0;
  const adapter: RuntimeAdapter = {
    async request(brief) {
      const arbitrary = {};
      Object.defineProperty(arbitrary, "leak", {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "vault:unused-runtime-field";
        },
      });
      return { ...validVote(brief.role, brief.actionDigest), arbitrary };
    },
  };

  const votes = await collectVotes(adapter, valid);

  expect(getterCalls).toBe(0);
  expect(votes.every((vote) => vote.decision === "approve")).toBe(true);
});

it.each([
  ["empty evidence", { evidenceRefs: [] }],
  ["whitespace evidence", { evidenceRefs: ["   "] }],
  ["sensitive reason", { reason: "vault:runtime-reason" }],
  ["sensitive evidence", { evidenceRefs: ["L3_TEST_SECRET_DO_NOT_LEAK"] }],
  ["extra vault reference", { vaultRef: "vault:runtime-reference" }],
])("fails closed for a Runtime vote with %s", async (_name, contamination) => {
  const adapter: RuntimeAdapter = {
    async request(brief) {
      return {
        role: brief.role,
        decision: "approve",
        actionDigest: brief.actionDigest,
        policyVersion: brief.policyVersion,
        issuedAt: "2026-08-16T00:00:00.000Z",
        reason: "substantive public evidence",
        evidenceRefs: ["evidence:public-review"],
        ...contamination,
      };
    },
  };

  const votes = await collectVotes(adapter, valid);

  expect(votes).toEqual(expect.arrayContaining([
    expect.objectContaining({
      role: "planner",
      decision: "reject",
      reason: "runtime result unavailable or invalid",
      evidenceRefs: [],
    }),
  ]));
  expect(JSON.stringify(votes)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(votes)).not.toContain("vault:");
  expect(JSON.stringify(votes)).not.toContain("vaultRef");
});

it("rejects accessor-backed Runtime votes without reading their mutable values", async () => {
  let reasonReads = 0;
  const adapter: RuntimeAdapter = {
    async request(brief) {
      const vote: Record<string, unknown> = {
        role: brief.role,
        decision: "approve",
        actionDigest: brief.actionDigest,
        policyVersion: brief.policyVersion,
        issuedAt: "2026-08-16T00:00:00.000Z",
        evidenceRefs: ["evidence:public-review"],
      };
      Object.defineProperty(vote, "reason", {
        enumerable: true,
        get() {
          reasonReads += 1;
          return reasonReads < 4 ? "public justification" : "vault:flip-after-check";
        },
      });
      return vote;
    },
  };

  const votes = await collectVotes(adapter, valid);

  expect(reasonReads).toBe(0);
  expect(votes.every((vote) => vote.decision === "reject")).toBe(true);
  expect(JSON.stringify(votes)).not.toContain("vault:");
});

it("rejects array subclasses, overridden array methods, and Proxy-like Runtime results", async () => {
  class DeceptiveEvidence extends Array<string> {}
  const overriddenMethods = Object.assign(["   "], {
    every: () => true,
    map: () => ["evidence:public-review"],
  });
  const responses: unknown[] = [
    {
      ...validVote("planner", valid.digest),
      evidenceRefs: overriddenMethods,
    },
    {
      ...validVote("planner", valid.digest),
      evidenceRefs: new DeceptiveEvidence("   "),
    },
    new Proxy(validVote("planner", valid.digest), {}),
  ];

  for (const response of responses) {
    const adapter: RuntimeAdapter = { async request() { return response; } };
    const votes = await collectVotes(adapter, valid);
    expect(votes).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "planner", decision: "reject", evidenceRefs: [] }),
    ]));
  }
});

it.each([
  ["zero-width identifier", "evidence:\u200B"],
  ["control-character identifier", "evidence:\u0007record"],
  ["empty identifier", "evidence:"],
  ["punctuation-only identifier", "evidence:---"],
])("rejects non-auditable %s", async (_name, evidenceRef) => {
  const adapter: RuntimeAdapter = {
    async request(brief) {
      return { ...validVote(brief.role, brief.actionDigest), evidenceRefs: [evidenceRef] };
    },
  };

  const votes = await collectVotes(adapter, valid);

  expect(votes.every((vote) => vote.decision === "reject")).toBe(true);
});

function validVote(role: "planner" | "safety" | "recovery", actionDigest: string) {
  return {
    role,
    decision: "approve" as const,
    actionDigest,
    policyVersion: "p0-2026-08-16",
    issuedAt: "2026-08-16T00:00:00.000Z",
    reason: "public justification",
    evidenceRefs: ["evidence:public-review"],
  };
}
