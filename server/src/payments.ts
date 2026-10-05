import crypto from "node:crypto";
import type { Request, Response } from "express";
import { IS_PROD, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, getPricing } from "./config.ts";
import { addCredits, db, getUser, transaction } from "./db.ts";

const razorpayEnabled = () => Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

export function getWallet(req: Request, res: Response) {
  const pricing = getPricing();
  res.json({
    credits: req.user!.credits,
    creditsPerMessage: pricing.creditsPerMessage,
    creditsPerPhoto: pricing.creditsPerPhoto,
    packs: pricing.packs,
    razorpayKeyId: razorpayEnabled() ? RAZORPAY_KEY_ID : null,
    devTopupEnabled: !IS_PROD,
  });
}

export async function createOrder(req: Request, res: Response) {
  const pack = getPricing().packs.find((p) => p.id === req.body?.packId);
  if (!pack) return res.status(400).json({ error: "invalid_pack" });
  if (!razorpayEnabled()) return res.status(503).json({ error: "payments_not_configured" });

  const rp = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: pack.priceInr * 100, // paise
      currency: "INR",
      receipt: `u${req.user!.id}-${Date.now()}`,
      notes: { userId: String(req.user!.id), packId: pack.id },
    }),
  });
  if (!rp.ok) {
    console.error("[razorpay] order failed", rp.status, await rp.text());
    return res.status(502).json({ error: "payment_provider_error" });
  }
  const order = (await rp.json()) as { id: string; amount: number; currency: string };

  db.prepare(
    "INSERT INTO payments (order_id, user_id, pack_id, amount_inr, credits) VALUES (?, ?, ?, ?, ?)",
  ).run(order.id, req.user!.id, pack.id, pack.priceInr, pack.credits);

  res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID });
}

/** Called by the app after Razorpay Checkout succeeds. */
export function verifyPayment(req: Request, res: Response) {
  const { orderId, paymentId, signature } = req.body ?? {};
  if (!orderId || !paymentId || !signature) return res.status(400).json({ error: "missing_fields" });

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  if (!safeEqual(expected, String(signature))) return res.status(400).json({ error: "invalid_signature" });

  const payment = db.prepare("SELECT user_id FROM payments WHERE order_id = ?").get(orderId) as
    | { user_id: number }
    | undefined;
  if (!payment || payment.user_id !== req.user!.id) return res.status(404).json({ error: "order_not_found" });

  markPaid(String(orderId), String(paymentId));
  res.json({ credits: getUser(req.user!.id)!.credits });
}

/**
 * Razorpay webhook (payment.captured). Backs up verifyPayment for when the app
 * is closed before it can report success. Needs the raw request body.
 */
export function razorpayWebhook(req: Request, res: Response) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  const body = req.body as Buffer;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (!secret || !safeEqual(expected, String(req.headers["x-razorpay-signature"] ?? ""))) {
    return res.status(400).end();
  }
  const event = JSON.parse(body.toString("utf8"));
  if (event.event === "payment.captured") {
    const p = event.payload?.payment?.entity;
    if (p?.order_id) markPaid(p.order_id, p.id);
  }
  res.json({ ok: true });
}

/** Idempotent: credits are added once per order no matter how many times this runs. */
function markPaid(orderId: string, paymentId: string) {
  transaction(() => {
    const row = db
      .prepare("UPDATE payments SET status = 'paid', payment_id = ? WHERE order_id = ? AND status = 'created' RETURNING user_id, credits")
      .get(paymentId, orderId) as { user_id: number; credits: number } | undefined;
    if (row) addCredits(row.user_id, row.credits, "purchase", orderId);
  });
}

/** Local testing only: grants a pack's credits without paying. Disabled when NODE_ENV=production. */
export function devTopup(req: Request, res: Response) {
  if (IS_PROD) return res.status(404).end();
  const pack = getPricing().packs.find((p) => p.id === req.body?.packId);
  if (!pack) return res.status(400).json({ error: "invalid_pack" });
  addCredits(req.user!.id, pack.credits, "dev_topup", pack.id);
  res.json({ credits: getUser(req.user!.id)!.credits });
}

function safeEqual(a: string, b: string) {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
