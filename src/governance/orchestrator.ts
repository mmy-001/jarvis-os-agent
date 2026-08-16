import type { GovernanceRole, GovernanceVote, ValidatedIntent } from "../contracts/domain.js";
import { types } from "node:util";
import type { RuntimeAdapter } from "../contracts/ports.js";
import { P0_POLICY_VERSION } from "../policy/static-policy-registry.js";
import { containsSensitiveContent, redactIntentForRuntime } from "../redaction/redactor.js";

const roles: readonly GovernanceRole[] = ["planner", "safety", "recovery"];

const isRole = (value: unknown): value is GovernanceRole =>
  value === "planner" || value === "safety" || value === "recovery";

function capturePlainRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  try {
    if (types.isProxy(value) || Object.getPrototypeOf(value) !== Object.prototype) return undefined;
    if (Object.getOwnPropertyDescriptor(value, "vaultRef") !== undefined) return undefined;
    const snapshot: Record<string, unknown> = {};
    for (const key of ["role", "decision", "actionDigest", "policyVersion", "issuedAt", "reason", "evidenceRefs"]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) return undefined;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return undefined;
  }
}

function captureEvidenceRefs(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  try {
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
    const length = lengthDescriptor !== undefined && "value" in lengthDescriptor ? lengthDescriptor.value : undefined;
    if (
      !Number.isSafeInteger(length)
      || length < 0
      || Object.getOwnPropertyNames(value).some((key) => key !== "length" && !/^(0|[1-9]\d*)$/.test(key))
    ) return undefined;
    const refs = Array.from({ length }, (_, index) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined;
    });
    return refs.every((ref): ref is string => typeof ref === "string") ? refs : undefined;
  } catch {
    return undefined;
  }
}

function isSubstantiveEvidenceRef(value: string): boolean {
  return /^evidence:[\p{L}\p{N}][\p{L}\p{N}._:/-]*$/u.test(value) && !containsSensitiveContent(value);
}

function invalid(role: GovernanceRole, actionDigest: string): GovernanceVote {
  return {
    role,
    decision: "reject",
    actionDigest,
    policyVersion: P0_POLICY_VERSION,
    issuedAt: "2026-08-16T00:00:00.000Z",
    reason: "runtime result unavailable or invalid",
    evidenceRefs: [],
  };
}

function isParseableIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  const timestamp = new Date(value);
  return !Number.isNaN(timestamp.valueOf()) && timestamp.toISOString() === value;
}

function valid(
  value: unknown,
  expectedRole: GovernanceRole,
  actionDigest: string,
): GovernanceVote | undefined {
  const vote = capturePlainRecord(value);
  if (vote === undefined) return undefined;
  const evidenceRefs = captureEvidenceRefs(vote.evidenceRefs);
  if (
    !isRole(vote.role)
    || vote.role !== expectedRole
    || (vote.decision !== "approve" && vote.decision !== "reject")
    || typeof vote.actionDigest !== "string"
    || !/^[a-f0-9]{64}$/.test(vote.actionDigest)
    || vote.actionDigest !== actionDigest
    || vote.policyVersion !== P0_POLICY_VERSION
    || !isParseableIsoTimestamp(vote.issuedAt)
    || typeof vote.reason !== "string"
    || vote.reason.trim().length === 0
    || containsSensitiveContent(vote.reason)
    || evidenceRefs === undefined
    || evidenceRefs.length === 0
    || !evidenceRefs.every(isSubstantiveEvidenceRef)
  ) return undefined;

  return {
    role: vote.role,
    decision: vote.decision,
    actionDigest: vote.actionDigest,
    policyVersion: vote.policyVersion,
    issuedAt: vote.issuedAt,
    reason: vote.reason.trim(),
    evidenceRefs: [...evidenceRefs],
  };
}

export async function collectVotes(
  adapter: RuntimeAdapter,
  intent: ValidatedIntent,
): Promise<readonly GovernanceVote[]> {
  return Promise.all(
    roles.map(async (role) => {
      try {
        return valid(
          await adapter.request({
            role,
            actionDigest: intent.digest,
            policyVersion: P0_POLICY_VERSION,
            intent: redactIntentForRuntime(intent.intent),
          }),
          role,
          intent.digest,
        ) ?? invalid(role, intent.digest);
      } catch {
        return invalid(role, intent.digest);
      }
    }),
  );
}
