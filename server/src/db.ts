import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { DB_PATH } from "./config.ts";

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY,
    phone       TEXT NOT NULL UNIQUE,
    dob         TEXT NOT NULL,
    credits     INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otps (
    phone       TEXT PRIMARY KEY,
    code_hash   TEXT NOT NULL,
    expires_at  INTEGER NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    persona_id  TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    text        TEXT NOT NULL,
    photo_id    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS messages_thread ON messages (user_id, persona_id, id);

  -- Every credit change is recorded so balances can be audited.
  CREATE TABLE IF NOT EXISTS credit_ledger (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    delta       INTEGER NOT NULL,
    reason      TEXT NOT NULL,
    ref         TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    order_id    TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    pack_id     TEXT NOT NULL,
    amount_inr  INTEGER NOT NULL,
    credits     INTEGER NOT NULL,
    status      TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid')),
    payment_id  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Free messages used per user per IST day.
  CREATE TABLE IF NOT EXISTS daily_usage (
    user_id     INTEGER NOT NULL REFERENCES users(id),
    day         TEXT NOT NULL,
    free_used   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );

  -- Per-chat state; drives the unread badge on the persona list.
  CREATE TABLE IF NOT EXISTS threads (
    user_id               INTEGER NOT NULL REFERENCES users(id),
    persona_id            TEXT NOT NULL,
    last_read_message_id  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, persona_id)
  );
`);

/** Adds a column to an existing table if it isn't there yet. Returns true when it was added. */
function ensureColumn(table: string, column: string, ddl: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (cols.some((c) => c.name === column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  return true;
}

ensureColumn("users", "streak", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "last_active_day", "TEXT");
if (ensureColumn("messages", "photo_unlocked", "INTEGER NOT NULL DEFAULT 0")) {
  // Photos sent before unlocking existed were already paid for.
  db.exec("UPDATE messages SET photo_unlocked = 1 WHERE photo_id IS NOT NULL");
}

export type User = { id: number; phone: string; dob: string; credits: number };

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function addCredits(userId: number, delta: number, reason: string, ref?: string) {
  db.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").run(delta, userId);
  db.prepare("INSERT INTO credit_ledger (user_id, delta, reason, ref) VALUES (?, ?, ?, ?)").run(
    userId,
    delta,
    reason,
    ref ?? null,
  );
}

/** Deducts credits only if the balance covers it. Returns false otherwise. */
export function spendCredits(userId: number, amount: number, reason: string, ref?: string): boolean {
  return transaction(() => trySpendCredits(userId, amount, reason, ref));
}

/** Same as spendCredits, for callers already inside a transaction. */
export function trySpendCredits(userId: number, amount: number, reason: string, ref?: string): boolean {
  const res = db
    .prepare("UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?")
    .run(amount, userId, amount);
  if (res.changes !== 1) return false;
  db.prepare("INSERT INTO credit_ledger (user_id, delta, reason, ref) VALUES (?, ?, ?, ?)").run(
    userId,
    -amount,
    reason,
    ref ?? null,
  );
  return true;
}

export function getUser(id: number): User | undefined {
  return db.prepare("SELECT id, phone, dob, credits FROM users WHERE id = ?").get(id) as User | undefined;
}
