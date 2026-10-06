const IST_OFFSET_MS = 330 * 60_000; // UTC+5:30, no DST

/** Calendar day in India (Asia/Kolkata) as "YYYY-MM-DD". */
export function istDay(now = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The day before a "YYYY-MM-DD" day. */
export function previousDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** SQLite's datetime('now') ("YYYY-MM-DD HH:MM:SS", UTC) → "YYYY-MM-DDTHH:MM:SSZ". */
export function toIso(sqliteUtc: string): string {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(sqliteUtc)) return `${sqliteUtc.replace(" ", "T")}Z`;
  return sqliteUtc;
}
