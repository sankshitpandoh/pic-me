import Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";
import { HISTORY_LIMIT, getPricing } from "./config.ts";
import { addCredits, db, getUser, spendCredits } from "./db.ts";
import { generateReply, type HistoryItem } from "./llm.ts";
import { extractPhoto, getPersona, listEnabledPersonas, type Persona } from "./personas.ts";

const MAX_USER_MESSAGE_CHARS = 1000;
// Shown when the model declines; the user is refunded for that turn.
const DEFLECTION = "Hmm, chalo kuch aur baat karte hain 🙂 Tell me something about your day?";

type MessageRow = { id: number; role: "user" | "assistant"; text: string; photo_id: string | null; created_at: string };

const mediaUrl = (req: Request, file: string) => `${req.protocol}://${req.get("host")}/media/${file}`;

export function listPersonas(req: Request, res: Response) {
  res.json(
    listEnabledPersonas().map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      city: p.city,
      languages: p.languages,
      tagline: p.tagline,
      avatarUrl: p.avatar ? mediaUrl(req, p.avatar) : null,
    })),
  );
}

function toClient(req: Request, persona: Persona, m: MessageRow) {
  const photo = m.photo_id ? persona.photos.find((p) => p.id === m.photo_id) : undefined;
  return {
    id: m.id,
    role: m.role,
    text: m.text,
    photoUrl: photo ? mediaUrl(req, photo.file) : null,
    createdAt: m.created_at,
  };
}

function insertMessage(userId: number, personaId: string, role: MessageRow["role"], text: string, photoId?: string) {
  return db
    .prepare(
      "INSERT INTO messages (user_id, persona_id, role, text, photo_id) VALUES (?, ?, ?, ?, ?) RETURNING id, role, text, photo_id, created_at",
    )
    .get(userId, personaId, role, text, photoId ?? null) as MessageRow;
}

export function getMessages(req: Request, res: Response) {
  const persona = getPersona(String(req.params.personaId));
  if (!persona) return res.status(404).json({ error: "persona_not_found" });
  const userId = req.user!.id;

  let rows = db
    .prepare("SELECT id, role, text, photo_id, created_at FROM messages WHERE user_id = ? AND persona_id = ? ORDER BY id DESC LIMIT 200")
    .all(userId, persona.id) as MessageRow[];
  if (rows.length === 0) rows = [insertMessage(userId, persona.id, "assistant", persona.greeting)];

  res.json({
    persona: { id: persona.id, name: persona.name, tagline: persona.tagline },
    messages: rows.reverse().map((m) => toClient(req, persona, m)),
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
  if (!spendCredits(userId, pricing.creditsPerMessage, "message", persona.id)) {
    return res.status(402).json({ error: "insufficient_credits", credits: getUser(userId)!.credits });
  }

  const userMsg = insertMessage(userId, persona.id, "user", text);
  const history = (
    db
      .prepare("SELECT role, text, photo_id FROM messages WHERE user_id = ? AND persona_id = ? ORDER BY id DESC LIMIT ?")
      .all(userId, persona.id, HISTORY_LIMIT) as Pick<MessageRow, "role" | "text" | "photo_id">[]
  )
    .reverse()
    .map((m): HistoryItem => ({ role: m.role, text: m.text, photoId: m.photo_id }));

  let result;
  try {
    result = await generateReply(persona, history);
  } catch (err) {
    // Undo the turn so the user can simply resend.
    db.prepare("DELETE FROM messages WHERE id = ?").run(userMsg.id);
    addCredits(userId, pricing.creditsPerMessage, "refund_error", persona.id);
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(503).json({ error: "busy_try_again" });
    }
    console.error("[chat] model call failed", err);
    return res.status(502).json({ error: "reply_failed" });
  }

  let replyText: string;
  let photoId: string | undefined;
  if (result.ok) {
    const extracted = extractPhoto(persona, result.text);
    replyText = extracted.text;
    // Photos cost extra; if the user can't cover it, send the text without the photo.
    if (extracted.photo && spendCredits(userId, pricing.creditsPerPhoto, "photo", `${persona.id}:${extracted.photo.id}`)) {
      photoId = extracted.photo.id;
    }
    if (!replyText && !photoId) replyText = "😊";
  } else {
    addCredits(userId, pricing.creditsPerMessage, `refund_${result.reason}`, persona.id);
    replyText = DEFLECTION;
  }

  const reply = insertMessage(userId, persona.id, "assistant", replyText, photoId);
  res.json({
    userMessage: toClient(req, persona, userMsg),
    reply: toClient(req, persona, reply),
    credits: getUser(userId)!.credits,
  });
}
