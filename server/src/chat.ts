import Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";
import { HISTORY_LIMIT, getPricing } from "./config.ts";
import { generateReply, type HistoryItem } from "./llm.ts";
import { extractPhoto, getPersona, listEnabledPersonas, type Persona } from "./personas.ts";
import {
  clearThread,
  deleteMessage,
  getMessage,
  insertMessage,
  markThreadRead,
  recentMessages,
  threadOverviews,
  unlockPhoto,
  type MessageRow,
  type ThreadOverview,
} from "./threads.ts";
import { toIso } from "./time.ts";
import { chargeMessage, recordActivity, refundMessage, walletSummary } from "./wallet.ts";

const MAX_USER_MESSAGE_CHARS = 1000;
const MESSAGES_PAGE = 200;
// Shown when the model declines; the user is refunded for that turn.
const DEFLECTION = "Hmm, chalo kuch aur baat karte hain 🙂 Tell me something about your day?";

const mediaUrl = (req: Request, file: string) => `${req.protocol}://${req.get("host")}/media/${file}`;

function personaSummary(req: Request, p: Persona, thread: ThreadOverview | undefined) {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    city: p.city,
    languages: p.languages,
    tagline: p.tagline,
    vibe: p.vibe,
    tags: p.tags,
    accent: p.accent,
    avatarUrl: p.avatar ? mediaUrl(req, p.avatar) : null,
    greeting: p.greeting,
    online: true,
    lastMessage: thread
      ? {
          text: thread.last.text,
          role: thread.last.role,
          createdAt: toIso(thread.last.created_at),
          hasPhoto: thread.last.photo_id !== null,
        }
      : null,
    unread: thread?.unread ?? 0,
  };
}

function personaDetail(req: Request, p: Persona, userId: number) {
  return {
    ...personaSummary(req, p, threadOverviews(userId).get(p.id)),
    starters: p.starters,
    photoCount: p.photos.length,
  };
}

export function listPersonas(req: Request, res: Response) {
  const threads = threadOverviews(req.user!.id);
  // Chats with history come first (most recent on top); the rest keep their sortOrder.
  const personas = listEnabledPersonas()
    .map((p, i) => ({ p, i, t: threads.get(p.id) }))
    .sort((a, b) => (b.t?.last.id ?? 0) - (a.t?.last.id ?? 0) || a.i - b.i);
  res.json(personas.map(({ p, t }) => personaSummary(req, p, t)));
}

function toClient(req: Request, persona: Persona, m: MessageRow, photoCost: number) {
  const photo = m.photo_id ? persona.photos.find((p) => p.id === m.photo_id) : undefined;
  const locked = !m.photo_unlocked;
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    createdAt: toIso(m.created_at),
    photo: photo
      ? { id: photo.id, caption: photo.caption, locked, url: locked ? null : mediaUrl(req, photo.file), cost: photoCost }
      : null,
  };
}

export function getMessages(req: Request, res: Response) {
  const persona = getPersona(String(req.params.personaId));
  if (!persona) return res.status(404).json({ error: "persona_not_found" });
  const userId = req.user!.id;
  const { creditsPerPhoto } = getPricing();

  let rows = recentMessages(userId, persona.id, MESSAGES_PAGE);
  if (rows.length === 0) rows = [insertMessage(userId, persona.id, "assistant", persona.greeting)];
  markThreadRead(userId, persona.id);

  res.json({
    persona: personaDetail(req, persona, userId),
    messages: rows.map((m) => toClient(req, persona, m, creditsPerPhoto)),
  });
}

export async function sendMessage(req: Request, res: Response) {
  const persona = getPersona(String(req.params.personaId));
  if (!persona) return res.status(404).json({ error: "persona_not_found" });

  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ error: "empty_message" });
  if (text.length > MAX_USER_MESSAGE_CHARS) return res.status(400).json({ error: "message_too_long" });

  const userId = req.user!.id;
  const pricing = getPricing();
  const charge = chargeMessage(userId, persona.id, new Date(), pricing);
  if (!charge) {
    return res.status(402).json({ error: "insufficient_credits", wallet: walletSummary(userId, new Date(), pricing) });
  }

  const userMsg = insertMessage(userId, persona.id, "user", text);
  const history = recentMessages(userId, persona.id, HISTORY_LIMIT).map(
    (m): HistoryItem => ({ role: m.role, text: m.text, photoId: m.photo_id }),
  );

  let result;
  try {
    result = await generateReply(persona, history);
  } catch (err) {
    // Undo the turn so the user can simply resend.
    deleteMessage(userMsg.id);
    refundMessage(userId, charge, "refund_error", persona.id);
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(503).json({ error: "busy_try_again" });
    }
    console.error("[chat] model call failed", err);
    return res.status(502).json({ error: "reply_failed" });
  }

  let replyText: string;
  let photoId: string | undefined;
  let streakBonus: number | null = null;
  if (result.ok) {
    // Photos arrive locked; the user pays creditsPerPhoto only if they choose to unlock one.
    const extracted = extractPhoto(persona, result.text);
    replyText = extracted.text;
    photoId = extracted.photo?.id;
    if (!replyText && !photoId) replyText = "😊";
    streakBonus = recordActivity(userId, new Date(), pricing);
  } else {
    refundMessage(userId, charge, `refund_${result.reason}`, persona.id);
    replyText = DEFLECTION;
  }

  const reply = insertMessage(userId, persona.id, "assistant", replyText, photoId);
  markThreadRead(userId, persona.id);
  res.json({
    userMessage: toClient(req, persona, userMsg, pricing.creditsPerPhoto),
    reply: toClient(req, persona, reply, pricing.creditsPerPhoto),
    wallet: walletSummary(userId, new Date(), pricing),
    streakBonus,
  });
}

export function unlockMessagePhoto(req: Request, res: Response) {
  const persona = getPersona(String(req.params.personaId));
  if (!persona) return res.status(404).json({ error: "persona_not_found" });
  const userId = req.user!.id;
  const messageId = Number(req.params.messageId);
  if (!Number.isSafeInteger(messageId)) return res.status(404).json({ error: "message_not_found" });

  const pricing = getPricing();
  const existing = getMessage(userId, persona.id, messageId);
  // A photo removed from the persona file can't be shown, so don't charge for it.
  if (!existing?.photo_id || !persona.photos.some((p) => p.id === existing.photo_id)) {
    return res.status(404).json({ error: "message_not_found" });
  }

  const result = unlockPhoto(userId, persona.id, messageId, pricing.creditsPerPhoto);
  if (result.status === "not_found") return res.status(404).json({ error: "message_not_found" });
  if (result.status === "insufficient_credits") {
    return res.status(402).json({ error: "insufficient_credits", wallet: walletSummary(userId, new Date(), pricing) });
  }
  res.json({
    message: toClient(req, persona, result.message, pricing.creditsPerPhoto),
    wallet: walletSummary(userId, new Date(), pricing),
  });
}

export function deleteChat(req: Request, res: Response) {
  const persona = getPersona(String(req.params.personaId));
  if (!persona) return res.status(404).json({ error: "persona_not_found" });
  clearThread(req.user!.id, persona.id);
  res.json({ ok: true });
}
