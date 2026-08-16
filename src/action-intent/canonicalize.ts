import { createHash } from "node:crypto";
import type { ActionIntent, ValidatedIntent } from "../contracts/domain.js";
import { isValidLogicalResourceId } from "./logical-resource-id.js";

function normalizeRiskAttributes(value: Record<string, unknown>): Pick<
  ActionIntent,
  "dataClass" | "externalEffect" | "reversible" | "bounded"
> {
  return {
    dataClass: value.dataClass === "public" || value.dataClass === "private" || value.dataClass === "credential"
      ? value.dataClass
      : "credential",
    externalEffect: typeof value.externalEffect === "boolean" ? value.externalEffect : true,
    reversible: typeof value.reversible === "boolean" ? value.reversible : false,
    bounded: typeof value.bounded === "boolean" ? value.bounded : false,
  };
}

export function validateAndDigest(intent: ActionIntent): ValidatedIntent {
  const value = intent as unknown as Record<string, unknown>;
  const { id, operation, targetResourceIds } = value;
  if (
    typeof id !== "string"
    || id.trim().length === 0
    || typeof operation !== "string"
    || operation.trim().length === 0
    || !Array.isArray(targetResourceIds)
    || targetResourceIds.length === 0
  ) {
    throw new Error("invalid ActionIntent");
  }

  const normalizedTargetResourceIds = Array.from(targetResourceIds);
  if (!normalizedTargetResourceIds.every(isValidLogicalResourceId)) {
    throw new Error("invalid ActionIntent");
  }
  normalizedTargetResourceIds.sort();
  const normalizedIntent: ActionIntent = {
    id,
    operation,
    targetResourceIds: normalizedTargetResourceIds,
    ...normalizeRiskAttributes(value),
    ...(typeof value.vaultRef === "string" && value.vaultRef.startsWith("vault:")
      ? { vaultRef: value.vaultRef as `vault:${string}` }
      : {}),
    userDescription: typeof value.userDescription === "string" ? value.userDescription : "",
  };
  const canonical = JSON.stringify({
    id: normalizedIntent.id,
    operation: normalizedIntent.operation,
    targetResourceIds: normalizedTargetResourceIds,
    dataClass: normalizedIntent.dataClass,
    externalEffect: normalizedIntent.externalEffect,
    reversible: normalizedIntent.reversible,
    bounded: normalizedIntent.bounded,
    vaultRef: normalizedIntent.vaultRef ?? null,
    userDescription: normalizedIntent.userDescription,
  });

  return {
    intent: normalizedIntent,
    digest: createHash("sha256").update(canonical).digest("hex"),
  };
}
