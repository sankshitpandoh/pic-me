import { db, transaction, trySpendCredits } from "./db.ts";

export type MessageRow = {
  id: number;
  role: "user" | "assistant";
  text: string;
  photo_id: string | null;
  photo_unlocked: number;
  created_at: string;
};

const COLUMNS = "id, role, text, photo_id, photo_unlocked, created_at";

export function insertMessage(
  userId: number,
  personaId: string,
  role: MessageRow["role"],
  text: string,
  photoId?: string,
): MessageRow {
  return db
    .prepare(`INSERT INTO messages (user_id, persona_id, role, text, photo_id) VALUES (?, ?, ?, ?, ?) RETURNING ${COLUMNS}`)
    .get(userId, personaId, role, text, photoId ?? null) as MessageRow;
}

export function deleteMessage(id: number) {
  db.prepare("DELETE FROM messages WHERE id = ?").run(id);
}

export function getMessage(userId: number, personaId: string, id: number): MessageRow | undefined {
  return db
    .prepare(`SELECT ${COLUMNS} FROM messages WHERE id = ? AND user_id = ? AND persona_id = ?`)
    .get(id, userId, personaId) as MessageRow | undefined;
}

/** Newest `limit` messages of a thread, oldest first. */
export function recentMessages(userId: number, personaId: string, limit: number): MessageRow[] {
  return (
    db
      .prepare(`SELECT ${COLUMNS} FROM messages WHERE user_id = ? AND persona_id = ? ORDER BY id DESC LIMIT ?`)
      .all(userId, personaId, limit) as MessageRow[]
  ).reverse();
}

/** Marks everything currently in the thread as read. */
export function markThreadRead(userId: number, personaId: string) {
  db.prepare(
    `INSERT INTO threads (user_id, persona_id, last_read_message_id)
     VALUES (?1, ?2, COALESCE((SELECT MAX(id) FROM messages WHERE user_id = ?1 AND persona_id = ?2), 0))
     ON CONFLICT(user_id, persona_id) DO UPDATE SET last_read_message_id = excluded.last_read_message_id`,
  ).run(userId, personaId);
}

export type ThreadOverview = { personaId: string; last: MessageRow; unread: number };

/** Latest message and unread count for every thread the user has. */
export function threadOverviews(userId: number): Map<string, ThreadOverview> {
  const lasts = db
    .prepare(
      `SELECT m.persona_id, ${COLUMNS.split(", ").map((c) => `m.${c}`).join(", ")}
       FROM messages m
       JOIN (SELECT persona_id, MAX(id) AS max_id FROM messages WHERE user_id = ? GROUP BY persona_id) t
         ON m.id = t.max_id`,
    )
    .all(userId) as (MessageRow & { persona_id: string })[];
  const unread = db
    .prepare(
      `SELECT m.persona_id, COUNT(*) AS n
       FROM messages m
       LEFT JOIN threads t ON t.user_id = m.user_id AND t.persona_id = m.persona_id
       WHERE m.user_id = ? AND m.role = 'assistant' AND m.id > COALESCE(t.last_read_message_id, 0)
       GROUP BY m.persona_id`,
    )
    .all(userId) as { persona_id: string; n: number }[];
  const unreadBy = new Map(unread.map((u) => [u.persona_id, u.n]));

  const out = new Map<string, ThreadOverview>();
  for (const { persona_id, ...last } of lasts) {
    out.set(persona_id, { personaId: persona_id, last, unread: unreadBy.get(persona_id) ?? 0 });
  }
  return out;
}

export function clearThread(userId: number, personaId: string) {
  transaction(() => {
    db.prepare("DELETE FROM messages WHERE user_id = ? AND persona_id = ?").run(userId, personaId);
    db.prepare("DELETE FROM threads WHERE user_id = ? AND persona_id = ?").run(userId, personaId);
  });
}

export type UnlockResult =
  | { status: "unlocked"; message: MessageRow; charged: number }
  | { status: "not_found" }
  | { status: "insufficient_credits" };

/** Charges `cost` once to reveal a photo message. Unlocking an already-unlocked photo is free. */
export function unlockPhoto(userId: number, personaId: string, messageId: number, cost: number): UnlockResult {
  return transaction(() => {
    const msg = db
      .prepare(`SELECT ${COLUMNS} FROM messages WHERE id = ? AND user_id = ? AND persona_id = ? AND photo_id IS NOT NULL`)
      .get(messageId, userId, personaId) as MessageRow | undefined;
    if (!msg) return { status: "not_found" } as const;
    if (msg.photo_unlocked) return { status: "unlocked", message: msg, charged: 0 } as const;
    if (cost > 0 && !trySpendCredits(userId, cost, "photo", `${personaId}:${msg.photo_id}:${msg.id}`)) {
      return { status: "insufficient_credits" } as const;
    }
    db.prepare("UPDATE messages SET photo_unlocked = 1 WHERE id = ?").run(msg.id);
    return { status: "unlocked", message: { ...msg, photo_unlocked: 1 }, charged: cost } as const;
  });
}

/** Removes everything stored for a user (account deletion). */
export function deleteAccount(userId: number) {
  transaction(() => {
    const user = db.prepare("SELECT phone FROM users WHERE id = ?").get(userId) as { phone: string } | undefined;
    for (const table of ["sessions", "messages", "credit_ledger", "payments", "threads", "daily_usage"]) {
      db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
    }
    if (user) db.prepare("DELETE FROM otps WHERE phone = ?").run(user.phone);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });
}
