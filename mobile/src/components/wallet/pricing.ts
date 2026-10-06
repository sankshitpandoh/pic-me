import type { Pack, Wallet } from "../../lib/api";

/** ₹ per credit of the cheapest-priced pack — the "normal rate" every saving is measured against. */
export function baseRate(packs: readonly Pack[]): number | null {
  if (!packs.length) return null;
  const cheapest = packs.reduce((a, b) => (b.priceInr < a.priceInr ? b : a));
  return cheapest.credits > 0 ? cheapest.priceInr / cheapest.credits : null;
}

/** "0.75" — rupees per message for a pack. */
export function perMessage(pack: Pack, creditsPerMessage: number): string {
  if (pack.credits <= 0) return "0.00";
  return ((pack.priceInr / pack.credits) * Math.max(1, creditsPerMessage)).toFixed(2);
}

/** Whole-percent saving vs the base rate, or 0. */
export function savingPct(pack: Pack, rate: number | null): number {
  if (!rate || pack.credits <= 0) return 0;
  const pct = Math.round((1 - pack.priceInr / pack.credits / rate) * 100);
  return pct > 0 ? pct : 0;
}

/** What the offer's credits would cost at the normal rate (rounded rupees), or null if it isn't cheaper. */
export function offerNormalPrice(offer: Pack, rate: number | null): number | null {
  if (!rate) return null;
  const n = Math.round(offer.credits * rate);
  return n > offer.priceInr ? n : null;
}

/** 1–3 gems for a pack, by its position in the price-sorted list. */
export function gemTier(index: number, count: number): 1 | 2 | 3 {
  if (count <= 1) return 1;
  return Math.min(3, Math.max(1, Math.round((index * 2) / (count - 1)) + 1)) as 1 | 2 | 3;
}

export function sortedPacks(w: Wallet): Pack[] {
  return [...w.packs].sort((a, b) => a.priceInr - b.priceInr);
}
