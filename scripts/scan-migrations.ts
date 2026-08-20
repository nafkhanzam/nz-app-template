#!/usr/bin/env -S pnpm exec tsx
// Classifies migration.sql files as breaking or safe, so deploy.sh (Langkah 7)
// can pick blue-green (safe) vs backup-then-stop-old (breaking) automatically
// instead of relying on a human to remember (§4.7).
//
// Usage: pnpm exec tsx scripts/scan-migrations.ts <migration.sql>...
//
// Matches real DDL keywords only (requires whitespace between words), so it
// does not false-positive on Prisma's own annotation comments — those render
// run-together like "-- DropTable"/"-- RenameColumn", never "DROP TABLE".
import { readFileSync } from "node:fs";

export interface MigrationClassification {
  breaking: boolean;
  reasons: string[];
}

const BREAKING_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "DROP TABLE", pattern: /\bDROP\s+TABLE\b/i },
  { label: "DROP COLUMN", pattern: /\bDROP\s+COLUMN\b/i },
  // Postgres: ALTER TABLE t ALTER COLUMN c [SET DATA] TYPE newtype
  { label: "ALTER COLUMN ... TYPE", pattern: /\bALTER\s+COLUMN\b[\s\S]*?\bTYPE\b/i },
  // Covers both RENAME TO (table) and RENAME COLUMN x TO y.
  { label: "RENAME", pattern: /\bRENAME\s+(TO|COLUMN)\b/i },
];

/** Strips `--` line comments so only real statements are matched. */
const stripSqlComments = (sql: string): string =>
  sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

export const classifyMigrationSql = (sql: string): MigrationClassification => {
  const body = stripSqlComments(sql);
  const reasons = BREAKING_PATTERNS.filter(({ pattern }) => pattern.test(body)).map(
    ({ label }) => label,
  );
  return { breaking: reasons.length > 0, reasons };
};

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("usage: scan-migrations.ts <migration.sql>...");
  process.exit(1);
}

let anyBreaking = false;
for (const path of paths) {
  const sql = readFileSync(path, "utf8");
  const { breaking, reasons } = classifyMigrationSql(sql);
  if (breaking) {
    anyBreaking = true;
    console.log(`BREAKING: ${path} (${reasons.join(", ")})`);
  } else {
    console.log(`safe: ${path}`);
  }
}

if (anyBreaking) {
  console.log(
    "\nAt least one migration is breaking — deploy must use backup-then-stop-old mode (§4.7), not blue-green.",
  );
}
// Exit 0 either way: this is a classifier, not a merge gate. Detecting
// "breaking" is not an error — it changes deploy mode, it doesn't block CI.
