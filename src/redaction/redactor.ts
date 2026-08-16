import type { ActionIntent } from "../contracts/domain.js";

const SECRET_SENTINEL = "L3_TEST_SECRET_DO_NOT_LEAK";
const VAULT_TOKEN = /vault:[^\s"'`{}\[\],]*/i;
const UNSAFE_CORE_PROJECTION = "unsafe Core projection";

export function containsSensitiveContent(value: string): boolean {
  return value.includes(SECRET_SENTINEL) || VAULT_TOKEN.test(value);
}

function sanitizeText(value: string): string {
  return value
    .replaceAll(SECRET_SENTINEL, "[REDACTED]")
    .replace(/vault:[^\s"'`{}\[\],]*/gi, "[REDACTED]");
}

export function redactIntentForRuntime(intent: ActionIntent): Record<string, unknown> {
  return {
    id: sanitizeText(intent.id),
    operation: sanitizeText(intent.operation),
    targetResourceIds: intent.targetResourceIds.map(sanitizeText),
    dataClass: sanitizeText(intent.dataClass),
    externalEffect: intent.externalEffect,
    reversible: intent.reversible,
    bounded: intent.bounded,
  };
}

function unsafeCoreProjection(): never {
  throw new Error(UNSAFE_CORE_PROJECTION);
}

function ownDataDescriptors(value: object): Record<string, PropertyDescriptor> {
  try {
    if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) unsafeCoreProjection();
    return Object.getOwnPropertyDescriptors(value);
  } catch (error) {
    if (error instanceof Error && error.message === UNSAFE_CORE_PROJECTION) throw error;
    return unsafeCoreProjection();
  }
}

function isPlainObject(value: object): boolean {
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function isSafeKey(key: string): boolean {
  return !["__proto__", "constructor", "prototype", "vaultRef", "toJSON"].includes(key)
    && !containsSensitiveContent(key);
}

function projectCoreValue(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return typeof value === "string" ? sanitizeText(value) : value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : unsafeCoreProjection();
  if (typeof value !== "object") return unsafeCoreProjection();
  if (ancestors.has(value)) unsafeCoreProjection();

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) unsafeCoreProjection();
      const descriptors = ownDataDescriptors(value);
      const length = descriptors["length"]?.value;
      if (!Number.isSafeInteger(length) || length < 0) unsafeCoreProjection();
      if (Object.keys(descriptors).some((key) => key !== "length" && !/^(0|[1-9]\d*)$/.test(key))) {
        unsafeCoreProjection();
      }
      return Array.from({ length }, (_, index) => {
        const descriptor = descriptors[String(index)];
        return descriptor === undefined ? unsafeCoreProjection() : projectCoreValue(descriptor.value, ancestors);
      });
    }

    if (!isPlainObject(value)) unsafeCoreProjection();
    const descriptors = ownDataDescriptors(value);
    const projection = Object.create(null) as Record<string, unknown>;
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!isSafeKey(key) || !("value" in descriptor) || typeof descriptor.value === "function") continue;
      Object.defineProperty(projection, key, {
        configurable: true,
        enumerable: true,
        value: projectCoreValue(descriptor.value, ancestors),
        writable: true,
      });
    }
    return projection;
  } finally {
    ancestors.delete(value);
  }
}

export function redactForCore<T>(value: T): T {
  return projectCoreValue(value, new Set()) as T;
}
