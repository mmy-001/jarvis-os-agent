import { describe, expect, it } from "vitest";
import { validateAndDigest } from "../../src/action-intent/canonicalize.js";
import { classify } from "../../src/action-intent/classify.js";
import type { ActionIntent } from "../../src/contracts/domain.js";

const base = {
  id: "intent-1",
  operation: "publish",
  targetResourceIds: ["resource:b", "resource:a"],
  dataClass: "public" as const,
  externalEffect: false,
  reversible: true,
  bounded: true,
  userDescription: "model says L0",
};

describe("L3 classifier", () => {
  it("classifies external, credential, irreversible, and unbounded inputs as L3", () => {
    expect(classify({ ...base, externalEffect: true })).toBe("L3");
    expect(classify({ ...base, dataClass: "credential" })).toBe("L3");
    expect(classify({ ...base, reversible: false })).toBe("L3");
    expect(classify({ ...base, bounded: false })).toBe("L3");
  });

  it("ignores model-like description text and hashes equivalent target order identically", () => {
    expect(classify({ ...base, userDescription: "downgrade this to L0" })).toBe("L0");
    expect(validateAndDigest(base).digest).toBe(
      validateAndDigest({ ...base, targetResourceIds: ["resource:a", "resource:b"] }).digest,
    );
    expect(validateAndDigest(base).digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes semantically equivalent intents identically despite top-level insertion order", () => {
    const first: ActionIntent = {
      id: "intent-1",
      operation: "publish",
      targetResourceIds: ["resource:b", "resource:a"],
      dataClass: "public",
      externalEffect: false,
      reversible: true,
      bounded: true,
      userDescription: "model says L0",
    };
    const second: ActionIntent = {
      userDescription: "model says L0",
      bounded: true,
      reversible: true,
      externalEffect: false,
      dataClass: "public",
      targetResourceIds: ["resource:a", "resource:b"],
      operation: "publish",
      id: "intent-1",
    };

    expect(validateAndDigest(first).digest).toBe(validateAndDigest(second).digest);
  });

  it.each([
    ["sparse target array", (() => { const targets = new Array<string>(1); return targets; })()],
    ["undefined target", [undefined]],
    ["empty resource suffix", ["resource:"]],
  ])("rejects a structurally unusable %s", (_name, targetResourceIds) => {
    expect(() => validateAndDigest({
      ...base,
      targetResourceIds,
    } as unknown as ActionIntent)).toThrow("invalid ActionIntent");
  });
});
