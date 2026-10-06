import { getPricing, type PackConfig, type Pricing } from "./config.ts";
import { addCredits, db, transaction, trySpendCredits } from "./db.ts";
import { istDay, previousDay } from "./time.ts";

export type WalletSummary = { credits: number; freeLeftToday: number; freePerDay: number; streak: number };

export type Pack = {
  id: string;
  priceInr: number;
  credits: number;
  label: string;
  badge: "popular" | "best" | "offer" | null;
  approxMessages: number;
};

/** How a message was paid for, so a failed turn can be refunded to the same bucket. */
export type MessageCharge = { kind: "free"; day: string } | { kind: "paid"; amount: number };

function freeUsed(userId: number, day: string): number {
  const row = db.prepare("SELECT free_used FROM daily_usage WHERE user_id = ? AND day = ?").get(userId, day) as
    | { free_used: number }
    | undefined;
  return row?.free_used ?? 0;
}

export function walletSummary(userId: number, now = new Date(), pricing: Pricing = getPricing()): WalletSummary {
  const user = db.prepare("SELECT credits, streak, last_active_day FROM users WHERE id = ?").get(userId) as
    | { credits: number; streak: number; last_active_day: string | null }
    | undefined;
  const today = istDay(now);
  // A streak that missed yesterday is already broken, even before the next message resets it.
  const alive = user?.last_active_day === today || user?.last_active_day === previousDay(today);
  return {
    credits: user?.credits ?? 0,
    freeLeftToday: Math.max(0, pricing.freeMessagesPerDay - freeUsed(userId, today)),
    freePerDay: pricing.freeMessagesPerDay,
    streak: alive ? (user?.streak ?? 0) : 0,
  };
}

/** Uses one of today's free messages if any are left, otherwise spends credits. Null if neither is possible. */
export function chargeMessage(
  userId: number,
  ref: string,
  now = new Date(),
  pricing: Pricing = getPricing(),
): MessageCharge | null {
  const day = istDay(now);
  return transaction(() => {
    if (freeUsed(userId, day) < pricing.freeMessagesPerDay) {
      db.prepare(
        `INSERT INTO daily_usage (user_id, day, free_used) VALUES (?, ?, 1)
         ON CONFLICT(user_id, day) DO UPDATE SET free_used = free_used + 1`,
      ).run(userId, day);
      return { kind: "free", day } as const;
    }
    const amount = pricing.creditsPerMessage;
    return trySpendCredits(userId, amount, "message", ref) ? ({ kind: "paid", amount } as const) : null;
  });
}

export function refundMessage(userId: number, charge: MessageCharge, reason: string, ref: string) {
  if (charge.kind === "free") {
    db.prepare("UPDATE daily_usage SET free_used = free_used - 1 WHERE user_id = ? AND day = ? AND free_used > 0").run(
      userId,
      charge.day,
    );
  } else {
    addCredits(userId, charge.amount, reason, ref);
  }
}

/**
 * Call after a successful message. The first one of each IST day extends the streak
 * (or restarts it at 1) and grants any bonus configured for the new length.
 * Returns the bonus credits granted, or null.
 */
export function recordActivity(userId: number, now = new Date(), pricing: Pricing = getPricing()): number | null {
  const today = istDay(now);
  return transaction(() => {
    const user = db.prepare("SELECT streak, last_active_day FROM users WHERE id = ?").get(userId) as
      | { streak: number; last_active_day: string | null }
      | undefined;
    if (!user || user.last_active_day === today) return null;
    const streak = user.last_active_day === previousDay(today) ? user.streak + 1 : 1;
    db.prepare("UPDATE users SET streak = ?, last_active_day = ? WHERE id = ?").run(streak, today, userId);
    const bonus = pricing.streakBonuses[String(streak)];
    if (!bonus || bonus <= 0) return null;
    addCredits(userId, bonus, "streak_bonus", today);
    return bonus;
  });
}

function toPack(p: PackConfig, pricing: Pricing, badge?: Pack["badge"]): Pack {
  return {
    id: p.id,
    priceInr: p.priceInr,
    credits: p.credits,
    label: p.label,
    badge: badge ?? p.badge ?? null,
    approxMessages: pricing.creditsPerMessage > 0 ? Math.floor(p.credits / pricing.creditsPerMessage) : 0,
  };
}

export function listPacks(pricing: Pricing = getPricing()): Pack[] {
  return pricing.packs.map((p) => toPack(p, pricing));
}

/** The first-purchase offer, or null once the user has paid (or dev-topped-up the offer). */
export function offerFor(userId: number, pricing: Pricing = getPricing()): Pack | null {
  const offer = pricing.firstPurchaseOffer;
  if (!offer) return null;
  const used =
    db.prepare("SELECT 1 FROM payments WHERE user_id = ? AND status = 'paid' LIMIT 1").get(userId) ||
    db
      .prepare("SELECT 1 FROM credit_ledger WHERE user_id = ? AND reason = 'dev_topup' AND ref = ? LIMIT 1")
      .get(userId, offer.id);
  return used ? null : toPack(offer, pricing, "offer");
}

/** Resolves a packId the user is allowed to buy: any regular pack, or the offer while eligible. */
export function findPurchasablePack(userId: number, packId: unknown, pricing: Pricing = getPricing()): Pack | null {
  const pack = pricing.packs.find((p) => p.id === packId);
  if (pack) return toPack(pack, pricing);
  const offer = offerFor(userId, pricing);
  return offer && offer.id === packId ? offer : null;
}
