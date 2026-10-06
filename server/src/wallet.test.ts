import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { Pricing } from "./config.ts";

// Never touch the real database: use DB_PATH if the runner set one, else a throwaway file.
process.env.DB_PATH ??= path.join(fs.mkdtempSync(path.join(os.tmpdir(), "playmate-test-")), "test.db");
const { db, addCredits } = await import("./db.ts");
const { istDay, previousDay, toIso } = await import("./time.ts");
const wallet = await import("./wallet.ts");
const threads = await import("./threads.ts");

const pricing: Pricing = {
  signupBonusCredits: 20,
  creditsPerMessage: 1,
  creditsPerPhoto: 3,
  freeMessagesPerDay: 2,
  streakBonuses: { "3": 5, "7": 15 },
  packs: [
    { id: "pack_10", priceInr: 10, credits: 12, label: "Chhota", badge: null },
    { id: "pack_49", priceInr: 49, credits: 65, label: "Sabse Popular", badge: "popular" },
  ],
  firstPurchaseOffer: { id: "offer_first", priceInr: 19, credits: 50, label: "Pehla Recharge Offer" },
};

let phoneSeq = 0;
function newUser(credits = 0): number {
  const phone = `+91${String(9000000000 + process.pid * 100 + ++phoneSeq)}`.slice(0, 13);
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (phone, dob, credits) VALUES (?, '2000-01-01', ?)")
    .run(`${phone}-${Date.now()}-${phoneSeq}`, credits);
  return Number(lastInsertRowid);
}
const credits = (id: number) => (db.prepare("SELECT credits FROM users WHERE id = ?").get(id) as { credits: number }).credits;
const at = (iso: string) => new Date(iso);

test("istDay uses Asia/Kolkata (UTC+5:30)", () => {
  assert.equal(istDay(at("2026-10-05T18:29:59Z")), "2026-10-05");
  assert.equal(istDay(at("2026-10-05T18:30:00Z")), "2026-10-06");
  assert.equal(istDay(at("2026-12-31T20:00:00Z")), "2027-01-01");
  assert.equal(previousDay("2026-03-01"), "2026-02-28");
  assert.equal(previousDay("2027-01-01"), "2026-12-31");
});

test("toIso converts SQLite timestamps to ISO-8601 UTC", () => {
  assert.equal(toIso("2026-10-06 04:05:06"), "2026-10-06T04:05:06Z");
  assert.equal(toIso("2026-10-06T04:05:06Z"), "2026-10-06T04:05:06Z");
  const row = threads.insertMessage(newUser(), "priya", "user", "hi");
  assert.match(toIso(row.created_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});

test("free messages are used before credits, then credits, then nothing", () => {
  const u = newUser(1);
  const now = at("2026-10-06T06:00:00Z");
  assert.deepEqual(wallet.chargeMessage(u, "priya", now, pricing), { kind: "free", day: "2026-10-06" });
  assert.deepEqual(wallet.chargeMessage(u, "priya", now, pricing), { kind: "free", day: "2026-10-06" });
  assert.equal(wallet.walletSummary(u, now, pricing).freeLeftToday, 0);
  assert.deepEqual(wallet.chargeMessage(u, "priya", now, pricing), { kind: "paid", amount: 1 });
  assert.equal(credits(u), 0);
  assert.equal(wallet.chargeMessage(u, "priya", now, pricing), null);
  // A new IST day brings the free messages back.
  const tomorrow = at("2026-10-06T18:30:00Z");
  assert.equal(wallet.walletSummary(u, tomorrow, pricing).freeLeftToday, 2);
  assert.equal(wallet.chargeMessage(u, "priya", tomorrow, pricing)?.kind, "free");
});

test("refunds go back to the bucket that paid", () => {
  const u = newUser(5);
  const now = at("2026-10-06T06:00:00Z");
  const free = wallet.chargeMessage(u, "priya", now, pricing)!;
  wallet.refundMessage(u, free, "refund_error", "priya");
  assert.equal(wallet.walletSummary(u, now, pricing).freeLeftToday, 2);
  assert.equal(credits(u), 5);

  wallet.chargeMessage(u, "priya", now, pricing);
  wallet.chargeMessage(u, "priya", now, pricing);
  const paid = wallet.chargeMessage(u, "priya", now, pricing)!;
  assert.equal(paid.kind, "paid");
  assert.equal(credits(u), 4);
  wallet.refundMessage(u, paid, "refund_refusal", "priya");
  assert.equal(credits(u), 5);
  assert.equal(wallet.walletSummary(u, now, pricing).freeLeftToday, 0);
  const refund = db.prepare("SELECT delta FROM credit_ledger WHERE user_id = ? AND reason = 'refund_refusal'").get(u);
  assert.deepEqual({ ...(refund as object) }, { delta: 1 });
});

test("streak counts consecutive IST days, resets after a gap, and pays bonuses", () => {
  const u = newUser(0);
  const day = (d: string) => at(`${d}T06:00:00Z`);
  assert.equal(wallet.recordActivity(u, day("2026-10-01"), pricing), null);
  assert.equal(wallet.recordActivity(u, day("2026-10-01"), pricing), null); // same day: no change
  assert.equal(wallet.walletSummary(u, day("2026-10-01"), pricing).streak, 1);
  assert.equal(wallet.recordActivity(u, day("2026-10-02"), pricing), null);
  assert.equal(wallet.recordActivity(u, day("2026-10-03"), pricing), 5); // day 3 bonus
  assert.equal(wallet.walletSummary(u, day("2026-10-03"), pricing).streak, 3);
  assert.equal(credits(u), 5);
  assert.equal(wallet.recordActivity(u, day("2026-10-03"), pricing), null); // only once per day
  assert.equal(credits(u), 5);
  // Shown streak drops to 0 once a day is missed, and the next message restarts at 1.
  assert.equal(wallet.walletSummary(u, day("2026-10-05"), pricing).streak, 0);
  assert.equal(wallet.recordActivity(u, day("2026-10-05"), pricing), null);
  assert.equal(wallet.walletSummary(u, day("2026-10-05"), pricing).streak, 1);
  const bonus = db.prepare("SELECT delta, ref FROM credit_ledger WHERE user_id = ? AND reason = 'streak_bonus'").all(u);
  assert.deepEqual(bonus.map((r) => ({ ...r })), [{ delta: 5, ref: "2026-10-03" }]);
});

test("streak of 7 pays the bigger bonus", () => {
  const u = newUser(0);
  let total = 0;
  for (let d = 1; d <= 7; d++) total += wallet.recordActivity(u, at(`2026-11-0${d}T06:00:00Z`), pricing) ?? 0;
  assert.equal(total, 20);
  assert.equal(credits(u), 20);
});

test("photo unlock charges once and is idempotent", () => {
  const u = newUser(4);
  const msg = threads.insertMessage(u, "priya", "assistant", "Dekho!", "chai");
  assert.equal(msg.photo_unlocked, 0);

  const first = threads.unlockPhoto(u, "priya", msg.id, 3);
  assert.equal(first.status, "unlocked");
  assert.equal(first.status === "unlocked" && first.charged, 3);
  assert.equal(credits(u), 1);

  const again = threads.unlockPhoto(u, "priya", msg.id, 3);
  assert.equal(again.status === "unlocked" && again.charged, 0);
  assert.equal(credits(u), 1);

  const other = threads.insertMessage(u, "priya", "assistant", "Aur ek", "office");
  assert.equal(threads.unlockPhoto(u, "priya", other.id, 3).status, "insufficient_credits");
  assert.equal(threads.getMessage(u, "priya", other.id)?.photo_unlocked, 0);
  assert.equal(credits(u), 1);
});

test("photo unlock 404s for other users, other personas and photo-less messages", () => {
  const u = newUser(10);
  const stranger = newUser(10);
  const msg = threads.insertMessage(u, "priya", "assistant", "Dekho!", "chai");
  const plain = threads.insertMessage(u, "priya", "assistant", "Hi");
  assert.equal(threads.unlockPhoto(stranger, "priya", msg.id, 3).status, "not_found");
  assert.equal(threads.unlockPhoto(u, "meera", msg.id, 3).status, "not_found");
  assert.equal(threads.unlockPhoto(u, "priya", plain.id, 3).status, "not_found");
  assert.equal(credits(u), 10);
});

test("first-purchase offer disappears after a paid order or an offer dev top-up", () => {
  const paidUser = newUser();
  assert.equal(wallet.offerFor(paidUser, pricing)?.badge, "offer");
  assert.equal(wallet.findPurchasablePack(paidUser, "offer_first", pricing)?.credits, 50);
  db.prepare("INSERT INTO payments (order_id, user_id, pack_id, amount_inr, credits) VALUES (?, ?, 'pack_10', 10, 12)").run(
    `order_${paidUser}`,
    paidUser,
  );
  assert.ok(wallet.offerFor(paidUser, pricing), "an unpaid order doesn't count");
  db.prepare("UPDATE payments SET status = 'paid' WHERE order_id = ?").run(`order_${paidUser}`);
  assert.equal(wallet.offerFor(paidUser, pricing), null);
  assert.equal(wallet.findPurchasablePack(paidUser, "offer_first", pricing), null);
  assert.equal(wallet.findPurchasablePack(paidUser, "pack_10", pricing)?.id, "pack_10");

  const devUser = newUser();
  addCredits(devUser, 12, "dev_topup", "pack_10");
  assert.ok(wallet.offerFor(devUser, pricing), "dev top-up of a regular pack doesn't count");
  addCredits(devUser, 50, "dev_topup", "offer_first");
  assert.equal(wallet.offerFor(devUser, pricing), null);
});

test("packs expose badge and approxMessages", () => {
  const packs = wallet.listPacks({ ...pricing, creditsPerMessage: 2 });
  assert.deepEqual(packs[1], {
    id: "pack_49", priceInr: 49, credits: 65, label: "Sabse Popular", badge: "popular", approxMessages: 32,
  });
  assert.equal(packs[0].badge, null);
});

test("unread counts assistant messages after the read marker", () => {
  const u = newUser();
  threads.insertMessage(u, "priya", "assistant", "greeting");
  assert.equal(threads.threadOverviews(u).get("priya")?.unread, 1);
  threads.markThreadRead(u, "priya");
  assert.equal(threads.threadOverviews(u).get("priya")?.unread, 0);
  threads.insertMessage(u, "priya", "user", "hello");
  threads.insertMessage(u, "priya", "assistant", "a");
  const last = threads.insertMessage(u, "priya", "assistant", "b");
  const t = threads.threadOverviews(u).get("priya")!;
  assert.equal(t.unread, 2);
  assert.equal(t.last.id, last.id);
  assert.equal(threads.threadOverviews(u).has("meera"), false);
  threads.clearThread(u, "priya");
  assert.equal(threads.threadOverviews(u).has("priya"), false);
});

test("deleteAccount removes every row for the user", () => {
  const u = newUser(5);
  const keep = newUser(5);
  threads.insertMessage(u, "priya", "user", "hi");
  threads.insertMessage(keep, "priya", "user", "hi");
  threads.markThreadRead(u, "priya");
  wallet.chargeMessage(u, "priya", new Date(), pricing);
  wallet.recordActivity(u, new Date(), pricing);
  addCredits(u, 1, "test");
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(`tok-${u}`, u);
  db.prepare("INSERT INTO payments (order_id, user_id, pack_id, amount_inr, credits) VALUES (?, ?, 'pack_10', 10, 12)").run(`o-${u}`, u);

  threads.deleteAccount(u);
  for (const table of ["sessions", "messages", "credit_ledger", "payments", "threads", "daily_usage"]) {
    const n = (db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).get(u) as { n: number }).n;
    assert.equal(n, 0, table);
  }
  assert.equal(db.prepare("SELECT 1 FROM users WHERE id = ?").get(u), undefined);
  assert.equal(threads.recentMessages(keep, "priya", 10).length, 1);
});
