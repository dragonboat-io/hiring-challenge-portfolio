import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "@/lib/db/schema";

const DEFAULT_PATH = "./data/app.db";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * One connection for the whole process. Cached on a module-level binding so
 * Next's dev-mode module reloading doesn't open a new handle per request.
 */
export function getDb() {
  if (!db) {
    const path = process.env.DATABASE_PATH ?? DEFAULT_PATH;
    mkdirSync(dirname(path), { recursive: true });
    const sqlite = new Database(path);
    // WAL keeps the assistant's writes from blocking page reads.
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite, { schema });
  }
  return db;
}
