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

export type Pricing = {
  signupBonusCredits: number;
  creditsPerMessage: number;
  creditsPerPhoto: number;
  packs: { id: string; priceInr: number; credits: number; label: string }[];
};

export function getPricing(): Pricing {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "config", "pricing.json"), "utf8"));
}
