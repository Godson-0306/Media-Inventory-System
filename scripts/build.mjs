import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const schemaPath = "prisma/schema.prisma";
const original = readFileSync(schemaPath, "utf8");
const databaseUrl = process.env.DATABASE_URL ?? "";
const usePostgres =
  process.env.VERCEL === "1" ||
  databaseUrl.startsWith("postgres://") ||
  databaseUrl.startsWith("postgresql://");

function run(command, options = {}) {
  const result = spawnSync(command, { stdio: "inherit", shell: true, ...options });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runSql(sql) {
  const result = spawnSync("npx prisma db execute --stdin", {
    input: sql,
    shell: true,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.warn("Optional SQL did not apply:", sql.trim());
    if (result.stderr) console.warn(result.stderr);
  }
}

if (usePostgres) {
  let next = original.replace('provider = "sqlite"', 'provider = "postgresql"');
  if (process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED) {
    const directVar = process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL_UNPOOLED";
    next = next.replace(
      'url      = env("DATABASE_URL")',
      `url       = env("DATABASE_URL")\n  directUrl = env("${directVar}")`,
    );
  }
  writeFileSync(schemaPath, next);
}

try {
  run("npx prisma generate");
  if (usePostgres) {
    runSql(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STAFF';`);
    runSql(`UPDATE "User" SET role = 'STAFF' WHERE role::text = 'OPERATOR';`);
    run("npx prisma db push --accept-data-loss");
  }
  run("npx next build");
} finally {
  if (usePostgres) {
    writeFileSync(schemaPath, original);
  }
}
