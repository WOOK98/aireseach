#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASELINE_PATH = "scripts/lint/oxlint-baseline.json";
const OXLINT_BIN =
  process.platform === "win32"
    ? join("node_modules", ".bin", "oxlint.cmd")
    : join("node_modules", ".bin", "oxlint");

const args = new Set(process.argv.slice(2));
const githubFormat = args.has("--format=github") || args.has("--github");

const escapeAnnotation = (value) =>
  String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A")
    .replaceAll(":", "%3A")
    .replaceAll(",", "%2C");

const readBaseline = () => {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  if (baseline.schemaVersion !== 1 || baseline.tool !== "oxlint") {
    throw new Error(`Unsupported oxlint baseline schema in ${BASELINE_PATH}`);
  }
  return baseline;
};

const diagnosticEntry = (diagnostic) => {
  const span = diagnostic.labels?.[0]?.span ?? {};
  const file = diagnostic.filename ?? "unknown";
  const line = span.line ?? 0;
  const column = span.column ?? 0;
  const code = diagnostic.code ?? "unknown";
  const message = diagnostic.message ?? "";

  return {
    fingerprint: [file, line, column, code, message].join(":"),
    file,
    line,
    column,
    code,
    message,
  };
};

const countByFingerprint = (entries) => {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry.fingerprint, (counts.get(entry.fingerprint) ?? 0) + 1);
  }
  return counts;
};

if (!existsSync(OXLINT_BIN)) {
  console.error(`oxlint binary not found at ${OXLINT_BIN}`);
  process.exit(1);
}

const baseline = readBaseline();
const result = spawnSync(OXLINT_BIN, ["--format", "json"], {
  encoding: "utf8",
  maxBuffer: 1024 * 1024 * 64,
});

if (!result.stdout.trim()) {
  console.error(result.stderr || "oxlint produced no JSON output");
  process.exit(result.status || 1);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout);
} catch (error) {
  console.error("Failed to parse oxlint JSON output.");
  console.error(error);
  console.error(result.stdout.slice(0, 2000));
  process.exit(1);
}

const currentEntries = (parsed.diagnostics ?? []).map(diagnosticEntry);
const baselineEntries = baseline.diagnostics ?? [];
const currentCounts = countByFingerprint(currentEntries);
const baselineCounts = countByFingerprint(baselineEntries);

const newEntries = [];
for (const entry of currentEntries) {
  const currentCount = currentCounts.get(entry.fingerprint) ?? 0;
  const baselineCount = baselineCounts.get(entry.fingerprint) ?? 0;
  if (currentCount > baselineCount) {
    newEntries.push(entry);
    currentCounts.set(entry.fingerprint, currentCount - 1);
  }
}

const currentTotal = currentEntries.length;
const baselineTotal = baseline.total ?? baselineEntries.length;
const resolvedTotal = Math.max(
  0,
  baselineTotal - currentTotal + newEntries.length,
);

if (newEntries.length === 0) {
  console.log(
    `oxlint baseline passed: ${currentTotal} current diagnostics, ${baselineTotal} tracked baseline diagnostics, ${resolvedTotal} resolved.`,
  );
  console.log(
    "Policy: existing diagnostics are tracked; new diagnostics are not allowed.",
  );
  process.exit(0);
}

console.error(
  `oxlint baseline failed: ${newEntries.length} new diagnostic(s) beyond ${baselineTotal} tracked baseline diagnostics.`,
);

for (const entry of newEntries) {
  if (githubFormat) {
    console.error(
      `::error file=${escapeAnnotation(entry.file)},line=${entry.line},col=${entry.column},title=${escapeAnnotation(entry.code)}::${escapeAnnotation(entry.message)}`,
    );
  } else {
    console.error(
      `${entry.file}:${entry.line}:${entry.column} ${entry.code} ${entry.message}`,
    );
  }
}

process.exit(1);
