import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { IS_PROD, getPricing } from "./config.ts";
import { addCredits, db, getUser, transaction, type User } from "./db.ts";

const OTP_TTL_MS = 5 * 60_000;
const OTP_RESEND_COOLDOWN_MS = 30_000;
const OTP_MAX_ATTEMPTS = 5;
const MIN_AGE = 18;

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/** Accepts "9876543210", "+91 98765 43210", "09876543210" and returns "+919876543210". */
export function normalizePhone(input: unknown): string | null {
  const digits = String(input ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export function ageOn(dob: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const birth = new Date(Date.UTC(y, mo - 1, d));
  if (birth.getUTCMonth() !== mo - 1 || birth.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() < mo - 1 || (today.getUTCMonth() === mo - 1 && today.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}

const hash = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

async function sendSms(phone: string, code: string) {
  // TODO: plug in an SMS provider with DLT-registered templates (MSG91, Twilio Verify, Firebase Auth...).
  console.log(`[otp] ${phone}: ${code}`);
}

export async function requestOtp(req: Request, res: Response) {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: "invalid_phone" });

  const existing = db.prepare("SELECT expires_at FROM otps WHERE phone = ?").get(phone) as
    | { expires_at: number }
    | undefined;
  if (existing && existing.expires_at - OTP_TTL_MS + OTP_RESEND_COOLDOWN_MS > Date.now()) {
    return res.status(429).json({ error: "otp_cooldown" });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare(
    `INSERT INTO otps (phone, code_hash, expires_at, attempts) VALUES (?, ?, ?, 0)
     ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
  ).run(phone, hash(code), Date.now() + OTP_TTL_MS);
  await sendSms(phone, code);

  const isNewUser = !db.prepare("SELECT 1 FROM users WHERE phone = ?").get(phone);
  res.json({ ok: true, isNewUser, ...(IS_PROD ? {} : { devCode: code }) });
}

export function verifyOtp(req: Request, res: Response) {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code ?? "");
  if (!phone) return res.status(400).json({ error: "invalid_phone" });

  const otp = db.prepare("SELECT code_hash, expires_at, attempts FROM otps WHERE phone = ?").get(phone) as
    | { code_hash: string; expires_at: number; attempts: number }
    | undefined;
  if (!otp || otp.expires_at < Date.now() || otp.attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(400).json({ error: "otp_expired" });
  }
  if (!crypto.timingSafeEqual(Buffer.from(otp.code_hash), Buffer.from(hash(code)))) {
    db.prepare("UPDATE otps SET attempts = attempts + 1 WHERE phone = ?").run(phone);
    return res.status(400).json({ error: "otp_invalid" });
  }

  let user = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone) as { id: number } | undefined;
  if (!user) {
    // New users must confirm they are adults. The OTP stays valid so the app can resubmit with a DOB.
    const dob = String(req.body?.dob ?? "");
    if (!dob) return res.status(409).json({ error: "dob_required" });
    const age = ageOn(dob);
    if (age === null) return res.status(400).json({ error: "invalid_dob" });
    if (age < MIN_AGE) {
      db.prepare("DELETE FROM otps WHERE phone = ?").run(phone);
      return res.status(403).json({ error: "underage" });
    }
    user = transaction(() => {
      const { lastInsertRowid } = db.prepare("INSERT INTO users (phone, dob) VALUES (?, ?)").run(phone, dob);
      const id = Number(lastInsertRowid);
      addCredits(id, getPricing().signupBonusCredits, "signup_bonus");
      return { id };
    });
  }

  db.prepare("DELETE FROM otps WHERE phone = ?").run(phone);
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, user.id);
  res.json({ token, user: getUser(user.id) });
}

export function logout(req: Request, res: Response) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(bearer(req));
  res.json({ ok: true });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(bearer(req)) as
    | { user_id: number }
    | undefined;
  const user = session && getUser(session.user_id);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  req.user = user;
  next();
}

function bearer(req: Request): string {
  return req.headers.authorization?.replace(/^Bearer /, "") ?? "";
}
