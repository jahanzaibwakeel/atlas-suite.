import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Only SQLite file: DATABASE_URL values are supported by the local setup script");
  }

  const sqlitePath = databaseUrl.slice("file:".length);

  if (isAbsolute(sqlitePath)) {
    return sqlitePath;
  }

  const normalized = sqlitePath.startsWith("./") ? sqlitePath.slice(2) : sqlitePath;
  return join(import.meta.dirname, normalized);
}

const dbPath = resolveDatabasePath();
const migrationPath = join(import.meta.dirname, "migrations", "000_init", "migration.sql");

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(readFileSync(migrationPath, "utf8"));
db.close();

console.log(`SQLite database ready at ${dbPath}`);
