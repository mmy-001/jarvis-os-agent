import type { ActionIntent, ActionLevel } from "../contracts/domain.js";

export function classify(intent: ActionIntent): ActionLevel {
  return intent.externalEffect || intent.dataClass === "credential" || !intent.reversible || !intent.bounded
    ? "L3"
    : "L0";
}
