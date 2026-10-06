import { t } from "./strings";

// On a physical phone, set EXPO_PUBLIC_API_URL to your computer's LAN IP, e.g. http://192.168.1.20:4000
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ───────────────────────────── types (mirror the server contract) ─────────────────────────────

/** Balance + daily-free + streak info. Returned on most wallet-affecting calls. */
export type WalletSummary = { credits: number; freeLeftToday: number; freePerDay: number; streak: number };

export type Me = { id: number; phone: string } & WalletSummary;

/** A photo attached to an assistant message. `url` is null while `locked`. */
export type PhotoInfo = { id: string; caption: string; locked: boolean; url: string | null; cost: number };

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  photo: PhotoInfo | null;
};

export type PersonaSummary = {
  id: string;
  name: string;
  age: number;
  city: string;
  languages: string[];
  tagline: string;
  vibe: string;
  tags: string[];
  /** Two hex colors for the persona's gradient identity; feed to `personaGradient(id, accent)`. */
  accent: [string, string] | null;
  avatarUrl: string | null;
  greeting: string;
  online: boolean;
  lastMessage: { text: string; role: "user" | "assistant"; createdAt: string; hasPhoto: boolean } | null;
  unread: number;
};

export type PersonaDetail = PersonaSummary & { starters: string[]; photoCount: number };

export type Pack = {
  id: string;
  priceInr: number;
  credits: number;
  label: string;
  badge: "popular" | "best" | "offer" | null;
  approxMessages: number;
};

export type Wallet = WalletSummary & {
  creditsPerMessage: number;
  creditsPerPhoto: number;
  packs: Pack[];
  /** First-recharge offer pack, if the user is eligible. */
  offer: Pack | null;
  razorpayKeyId: string | null;
  devTopupEnabled: boolean;
};

export type SendResult = {
  userMessage: ChatMessage;
  reply: ChatMessage;
  wallet: WalletSummary;
  /** Credits granted for a streak milestone on this send, if any. */
  streakBonus: number | null;
};

export type Order = { orderId: string; amount: number; currency: string; keyId: string };

// ───────────────────────────── transport ─────────────────────────────

/** Thrown for any non-2xx response. `code` is the server's `error` field (e.g. "insufficient_credits"). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body: Record<string, unknown>,
  ) {
    super(code);
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

type Method = "GET" | "POST" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, json.error ?? "request_failed", json);
  }
  return json as T;
}

const enc = encodeURIComponent;

// ───────────────────────────── endpoints ─────────────────────────────

export const api = {
  requestOtp: (phone: string) =>
    request<{ ok: true; isNewUser: boolean; devCode?: string }>("POST", "/auth/otp/request", { phone }),
  /** `dob` is "YYYY-MM-DD", required for new users (server replies `dob_required` otherwise). */
  verifyOtp: (phone: string, code: string, dob?: string) =>
    request<{ token: string; user: Me }>("POST", "/auth/otp/verify", { phone, code, dob }),
  logout: () => request<{ ok: true }>("POST", "/auth/logout"),

  me: () => request<Me>("GET", "/me"),
  deleteMe: () => request<{ ok: true }>("DELETE", "/me"),

  personas: () => request<PersonaSummary[]>("GET", "/personas"),
  messages: (personaId: string) =>
    request<{ persona: PersonaDetail; messages: ChatMessage[] }>("GET", `/chats/${enc(personaId)}/messages`),
  /** On 402 (`insufficient_credits`) the error body carries `wallet` — read it with `walletFromError`. */
  send: (personaId: string, text: string) =>
    request<SendResult>("POST", `/chats/${enc(personaId)}/messages`, { text }),
  unlockPhoto: (personaId: string, messageId: number) =>
    request<{ message: ChatMessage; wallet: WalletSummary }>(
      "POST",
      `/chats/${enc(personaId)}/messages/${messageId}/unlock`,
    ),
  clearChat: (personaId: string) => request<{ ok: true }>("DELETE", `/chats/${enc(personaId)}`),

  wallet: () => request<Wallet>("GET", "/wallet"),
  createOrder: (packId: string) => request<Order>("POST", "/wallet/orders", { packId }),
  verifyPayment: (orderId: string, paymentId: string, signature: string) =>
    request<{ wallet: WalletSummary }>("POST", "/wallet/orders/verify", { orderId, paymentId, signature }),
  devTopup: (packId: string) => request<{ wallet: WalletSummary }>("POST", "/wallet/dev-topup", { packId }),
};

// ───────────────────────────── helpers ─────────────────────────────

/** True when the error is a 402 / out-of-credits response. */
export function isOutOfCredits(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 402 || err.code === "insufficient_credits");
}

/** Extracts the `wallet` summary some error bodies carry (e.g. 402 on send/unlock), else null. */
export function walletFromError(err: unknown): WalletSummary | null {
  if (!(err instanceof ApiError)) return null;
  const w = err.body.wallet as WalletSummary | undefined;
  return w && typeof w.credits === "number" ? w : null;
}

/** User-facing Hinglish message for any error thrown by `api.*`. Non-ApiErrors are treated as network failures. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return (t.errors as Record<string, string>)[err.code] ?? t.errors.generic;
  return t.errors.network;
}
