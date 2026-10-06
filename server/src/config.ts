import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

export const PERSONAS_DIR = process.env.PERSONAS_DIR ?? path.join(ROOT, "personas");
export const MEDIA_DIR = path.join(PERSONAS_DIR, "media");
export const DB_PATH = process.env.DB_PATH ?? path.join(ROOT, "data", "app.db");

export const PORT = Number(process.env.PORT ?? 4000);
export const IS_PROD = process.env.NODE_ENV === "production";

/** Any current Claude model id works here; see README for the cost tradeoff. */
export const CHAT_MODEL = process.env.CHAT_MODEL ?? "claude-opus-5-5";
export const CHAT_EFFORT = (process.env.CHAT_EFFORT ?? "low") as "low" | "medium" | "high";
/** How many past messages are sent to the model on each turn. */
export const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT ?? 40);

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

export type PackConfig = {
  id: string;
  priceInr: number;
  credits: number;
  label: string;
  badge?: "popular" | "best" | "offer" | null;
};

export type Pricing = {
  signupBonusCredits: number;
  creditsPerMessage: number;
  creditsPerPhoto: number;
  freeMessagesPerDay: number;
  /** Streak length (in IST days) → bonus credits granted when the streak reaches it. */
  streakBonuses: Record<string, number>;
  packs: PackConfig[];
  /** One-time cheaper pack for users who have never paid. */
  firstPurchaseOffer: PackConfig | null;
};

export function getPricing(): Pricing {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, "config", "pricing.json"), "utf8")) as Partial<Pricing>;
  return {
    signupBonusCredits: raw.signupBonusCredits ?? 0,
    creditsPerMessage: raw.creditsPerMessage ?? 1,
    creditsPerPhoto: raw.creditsPerPhoto ?? 0,
    freeMessagesPerDay: raw.freeMessagesPerDay ?? 0,
    streakBonuses: raw.streakBonuses ?? {},
    packs: raw.packs ?? [],
    firstPurchaseOffer: raw.firstPurchaseOffer ?? null,
  };
}
