const logicalResourceSegment = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// A bare single-letter first namespace is reserved across hosts because it is
// indistinguishable from a Windows drive-relative path. Use `ns:<letter>:...`
// when a logical namespace needs a single-letter segment.
export const RESERVED_AMBIGUOUS_RESOURCE_SUFFIX = /^[A-Za-z]:/;

export function isValidLogicalResourceId(value: unknown): value is `resource:${string}` {
  if (typeof value !== "string" || !value.startsWith("resource:")) return false;

  const suffix = value.slice("resource:".length);
  if (RESERVED_AMBIGUOUS_RESOURCE_SUFFIX.test(suffix)) return false;

  const segments = suffix.split(":");
  return segments.length > 0 && segments.every((segment) => (
    segment !== "." && segment !== ".." && logicalResourceSegment.test(segment)
  ));
}

export function validateLogicalResourceId(value: unknown): `resource:${string}` {
  if (!isValidLogicalResourceId(value)) throw new Error("invalid logical resource ID");
  return value;
}
