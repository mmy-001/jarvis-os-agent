import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, it } from "vitest";

type BoundaryViolation = { rule: string; source: string };

const sourceRules: readonly Readonly<{ rule: string; expression: RegExp }>[] = [
  { rule: "process execution", expression: /(?:\bfrom\s*|\brequire\(\s*|\bimport\s*(?:\(\s*)?)["'](?:node:)?child_process["']|\b(?:spawn|exec(?:File|Sync)?|fork)\s*\(|\b(?:Bun\.spawn|Deno\.Command)\b|\b(?:createRequire|process\.getBuiltinModule)\s*\(/ },
  { rule: "network client", expression: /(?:\bfrom\s*|\brequire\(\s*|\bimport\s*(?:\(\s*)?)["'](?:node:)?(?:net|http|https|tls|dgram|dns|node-fetch|got|superagent)["']|\b(?:fetch|WebSocket|XMLHttpRequest)\s*\(|\bnavigator\.sendBeacon\s*\(/ },
  { rule: "real Runtime or model SDK", expression: /(?:\bfrom\s*|\brequire\(\s*|\bimport\s*(?:\(\s*)?)["'][^"']*(?:deepseek|harness|openai|anthropic|gemini)[^"']*["']/i },
  { rule: "real UI or account SDK", expression: /(?:\bfrom\s*|\brequire\(\s*|\bimport\s*(?:\(\s*)?)["'][^"']*(?:electron|tauri|stripe|auth0|account)[^"']*["']/i },
];

const packageRule = /(?:deepseek|harness|openai|anthropic|gemini|axios|undici|node-fetch|got|superagent|electron|tauri|stripe|auth0)/i;
const scriptRule = /\b(?:curl|wget|Invoke-WebRequest|node-fetch|got|superagent|createRequire|process\.getBuiltinModule|child_process|fetch)\b/i;

function directPackageNames(metadata: Record<string, unknown>): string[] {
  const packages = metadata.packages as Record<string, unknown> | undefined;
  const root = typeof packages === "object" && packages !== null && "" in packages
    ? packages[""]
    : metadata;
  if (typeof root !== "object" || root === null) return [];
  const rootRecord = root as Record<string, unknown>;

  return ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].flatMap((section) => {
    const dependencies = rootRecord[section];
    return typeof dependencies === "object" && dependencies !== null ? Object.keys(dependencies) : [];
  });
}

function inspectSource(source: string): BoundaryViolation[] {
  return sourceRules
    .filter(({ expression }) => expression.test(source))
    .map(({ rule }) => ({ rule, source }));
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(location) : entry.name.endsWith(".ts") ? [location] : [];
  });
}

it("detects representative forbidden P0 capability snippets", () => {
  expect(inspectSource('import { spawn } from "node:child_process";')).toHaveLength(1);
  expect(inspectSource('await import("node:child_process");')).toHaveLength(1);
  expect(inspectSource('const load = createRequire(import.meta.url); load("node:child_process");')).toHaveLength(1);
  expect(inspectSource('process.getBuiltinModule("dns");')).toHaveLength(1);
  expect(inspectSource('await fetch("https://example.invalid");')).toHaveLength(1);
  expect(inspectSource('import got from "got";')).toHaveLength(1);
  expect(inspectSource('import "node-fetch";')).toHaveLength(1);
  expect(inspectSource('import request from "superagent";')).toHaveLength(1);
  expect(inspectSource('import dns from "node:dns";')).toHaveLength(1);
  expect(inspectSource('import "@deepseek/harness";')).toHaveLength(1);
  expect(inspectSource('import { app } from "electron";')).toHaveLength(1);
  expect(directPackageNames({ dependencies: { got: "1.0.0" } })).toEqual(["got"]);
  expect(["got"]).toEqual(expect.arrayContaining([expect.stringMatching(packageRule)]));
  expect(['node -e "process.getBuiltinModule(\\\'dns\\\')"']).toEqual(expect.arrayContaining([
    expect.stringMatching(scriptRule),
  ]));
});

it("keeps the production tree and package metadata inside the P0 no-capability boundary", () => {
  const root = process.cwd();
  const violations = sourceFiles(join(root, "src")).flatMap((file) =>
    inspectSource(readFileSync(file, "utf8")).map((violation) => ({
      ...violation,
      source: relative(root, file),
    })),
  );
  const directDependencies = ["package.json", "package-lock.json"]
    .flatMap((file) => directPackageNames(JSON.parse(readFileSync(join(root, file), "utf8")) as Record<string, unknown>));
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };

  expect(violations).toEqual([]);
  expect(directDependencies).not.toEqual(expect.arrayContaining([
    expect.stringMatching(packageRule),
  ]));
  expect(Object.values(scripts.scripts ?? {})).not.toEqual(expect.arrayContaining([
    expect.stringMatching(scriptRule),
  ]));
});
