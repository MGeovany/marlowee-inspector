import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import os from "os";
import * as schema from "./schema";

export type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | null = null;

function resolveDbPath(): string {
  if (process.env.MARLOWEE_DB_PATH) return process.env.MARLOWEE_DB_PATH;
  const homeDb = path.join(os.homedir(), ".marlowee-inspector", "marlowee.db");
  if (existsSync(homeDb)) return homeDb;
  const cwd = process.cwd();
  const cwdData = path.join(cwd, "data", "marlowee.db");
  if (existsSync(cwdData)) return cwdData;
  return cwdData;
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function createClient(): DbInstance {
  if (_db) return _db;

  const dbPath = resolveDbPath();
  ensureDir(dbPath);

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });
  return _db;
}

export function getDb(): DbInstance {
  if (!_db) return createClient();
  return _db;
}

export function closeDb() {
  if (_db) {
    _db = null;
  }
}
