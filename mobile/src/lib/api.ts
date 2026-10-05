// On a physical phone, set EXPO_PUBLIC_API_URL to your computer's LAN IP, e.g. http://192.168.1.20:4000
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export type User = { id: number; phone: string; credits: number };

export type Persona = {
  id: string;
  name: string;
  age: number;
  city: string;
  languages: string[];
  tagline: string;
  avatarUrl: string | null;
};

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  photoUrl: string | null;
  createdAt: string;
};

export type Pack = { id: string; priceInr: number; credits: number; label: string };

export type Wallet = {
  credits: number;
  creditsPerMessage: number;
  creditsPerPhoto: number;
  packs: Pack[];
  razorpayKeyId: string | null;
  devTopupEnabled: boolean;
};

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

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
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

export const api = {
  requestOtp: (phone: string) =>
    request<{ ok: true; isNewUser: boolean; devCode?: string }>("POST", "/auth/otp/request", { phone }),
  verifyOtp: (phone: string, code: string, dob?: string) =>
    request<{ token: string; user: User }>("POST", "/auth/otp/verify", { phone, code, dob }),
  logout: () => request("POST", "/auth/logout"),

  me: () => request<User>("GET", "/me"),
  personas: () => request<Persona[]>("GET", "/personas"),
  messages: (personaId: string) =>
    request<{ persona: Pick<Persona, "id" | "name" | "tagline">; messages: ChatMessage[] }>(
      "GET",
      `/chats/${personaId}/messages`,
    ),
  send: (personaId: string, text: string) =>
    request<{ userMessage: ChatMessage; reply: ChatMessage; credits: number }>(
      "POST",
      `/chats/${personaId}/messages`,
      { text },
    ),

  wallet: () => request<Wallet>("GET", "/wallet"),
  createOrder: (packId: string) =>
    request<{ orderId: string; amount: number; currency: string; keyId: string }>("POST", "/wallet/orders", {
      packId,
    }),
  verifyPayment: (orderId: string, paymentId: string, signature: string) =>
    request<{ credits: number }>("POST", "/wallet/orders/verify", { orderId, paymentId, signature }),
  devTopup: (packId: string) => request<{ credits: number }>("POST", "/wallet/dev-topup", { packId }),
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_phone: "Please enter a valid 10-digit mobile number.",
  otp_cooldown: "Please wait 30 seconds before requesting another OTP.",
  otp_invalid: "That OTP is incorrect.",
  otp_expired: "This OTP has expired. Please request a new one.",
  invalid_dob: "Please enter a valid date of birth.",
  underage: "Sorry, you must be 18 or older to use this app.",
  insufficient_credits: "You're out of credits. Recharge to keep chatting.",
  busy_try_again: "She's a little busy, try again in a moment.",
  reply_failed: "Message failed to send. Please try again.",
  payments_not_configured: "Payments aren't set up yet.",
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return ERROR_MESSAGES[err.code] ?? "Something went wrong. Please try again.";
  return "Can't reach the server. Check your internet connection.";
}
