import { expect, it } from "vitest";
import { redactForCore, redactIntentForRuntime } from "../../src/redaction/redactor.js";

it("never emits secret description or vault reference in a Runtime brief", () => {
  const brief = redactIntentForRuntime({
    id: "intent-1",
    operation: "publish",
    targetResourceIds: ["resource:one"],
    dataClass: "credential",
    externalEffect: true,
    reversible: false,
    bounded: true,
    vaultRef: "vault:secret",
    userDescription: "L3_TEST_SECRET_DO_NOT_LEAK",
  });

  expect(Object.keys(brief)).toEqual([
    "id",
    "operation",
    "targetResourceIds",
    "dataClass",
    "externalEffect",
    "reversible",
    "bounded",
  ]);
  expect(brief).not.toHaveProperty("vaultRef");
  expect(brief).not.toHaveProperty("userDescription");
  expect(JSON.stringify(brief)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(brief)).not.toContain("vault:secret");
});

it("redacts the known sentinel before returning a Core-safe value", () => {
  const value = { note: "L3_TEST_SECRET_DO_NOT_LEAK" };

  expect(redactForCore(value)).toEqual({ note: "[REDACTED]" });
});

it("sanitizes sensitive text from every allowed Runtime string field and nested Core values", () => {
  const brief = redactIntentForRuntime({
    id: "intent-L3_TEST_SECRET_DO_NOT_LEAK",
    operation: "publish vault:runtime-token",
    targetResourceIds: ["resource:one", "resource:vault:target-token"],
    dataClass: "credential",
    externalEffect: true,
    reversible: false,
    bounded: true,
    userDescription: "ignored",
  });
  const core = redactForCore({
    vaultRef: "vault:top-level",
    nested: {
      note: "L3_TEST_SECRET_DO_NOT_LEAK and vault:nested-token",
      vaultRef: "vault:nested-reference",
      items: ["vault:array-token", { vaultRef: "vault:array-reference" }],
    },
  });

  expect(Object.keys(brief)).toEqual([
    "id",
    "operation",
    "targetResourceIds",
    "dataClass",
    "externalEffect",
    "reversible",
    "bounded",
  ]);
  expect(JSON.stringify(brief)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(brief)).not.toContain("vault:");
  expect(JSON.stringify(core)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
  expect(JSON.stringify(core)).not.toContain("vault:");
  expect(JSON.stringify(core)).not.toContain("vaultRef");
});

it("projects only own data without calling getters or toJSON hooks", () => {
  let getterCalls = 0;
  let toJsonCalls = 0;
  const input = {
    safe: "public value",
    toJSON() {
      toJsonCalls += 1;
      return { leak: "vault:to-json" };
    },
  };
  Object.defineProperty(input, "getter", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "vault:getter";
    },
  });
  const nested = {};
  Object.defineProperty(nested, "getter", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "vault:nested-getter";
    },
  });
  Object.assign(input, { nested });

  const projection = redactForCore(input);
  const serialized = JSON.stringify(projection);

  expect(getterCalls).toBe(0);
  expect(toJsonCalls).toBe(0);
  expect(serialized).toBe('{"safe":"public value","nested":{}}');
});

it("fails closed for circular and unsupported Core values", () => {
  const circular: { self?: unknown } = {};
  circular.self = circular;

  expect(() => redactForCore(circular)).toThrow("unsafe Core projection");
  expect(() => redactForCore({ value: undefined })).toThrow("unsafe Core projection");
  expect(() => redactForCore({ value: Number.NaN })).toThrow("unsafe Core projection");
  expect(() => redactForCore({ value: Number.POSITIVE_INFINITY })).toThrow("unsafe Core projection");
  expect(() => redactForCore({ value: 1n })).toThrow("unsafe Core projection");
  expect(() => redactForCore({ value: Symbol("unsafe") })).toThrow("unsafe Core projection");
  expect(() => redactForCore({ value: new Date() })).toThrow("unsafe Core projection");
});

it("drops sensitive property names as well as sensitive values", () => {
  const projection = redactForCore({
    safe: "public",
    vaultRef: "opaque",
    "vault:property-token": "public",
    L3_TEST_SECRET_DO_NOT_LEAK: "public",
  });

  expect(JSON.stringify(projection)).toBe('{"safe":"public"}');
});

it("does not invoke a nested getter while projecting Core data", () => {
  let getterCalls = 0;
  const nested = {};
  Object.defineProperty(nested, "leak", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "vault:nested-getter";
    },
  });

  expect(redactForCore({ nested })).toEqual({ nested: {} });
  expect(getterCalls).toBe(0);
});

it("drops prototype-polluting keys into a null-prototype JSON-safe Core projection", () => {
  const input = JSON.parse(`{
    "__proto__": { "polluted": "vault:prototype-payload" },
    "constructor": "L3_TEST_SECRET_DO_NOT_LEAK",
    "prototype": "vault:prototype-key",
    "safe": "public"
  }`);

  const projection = redactForCore(input) as Record<string, unknown>;

  expect(Object.getPrototypeOf(projection)).toBeNull();
  expect(projection).toEqual({ safe: "public" });
  expect(JSON.stringify(projection)).toBe('{"safe":"public"}');
  expect(JSON.stringify(projection)).not.toContain("vault:");
  expect(JSON.stringify(projection)).not.toContain("L3_TEST_SECRET_DO_NOT_LEAK");
});
