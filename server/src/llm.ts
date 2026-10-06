import Anthropic from "@anthropic-ai/sdk";
import { CHAT_EFFORT, CHAT_MODEL } from "./config.ts";
import type { Persona } from "./personas.ts";

const client = new Anthropic();

/**
 * MOCK_LLM=1 replies with canned lines instead of calling the API. For UI development and demos
 * without an API key; never enable it in production.
 */
const MOCK_LLM = process.env.MOCK_LLM === "1";

const MOCK_LINES = [
  "Haha sach mein? 😄 Aur batao, aaj ka din kaisa gaya?",
  "Aww, tumse baat karke achha lagta hai 😊 Khana kha liya?",
  "Arre wah! Phir kya hua? Mujhe poori kahani sunao 👀",
  "Hmm, samajh sakti hoon. Thoda aaram karo, main hoon na baat karne ke liye 🤗",
  "Accha ye batao, tumhare shehar mein sabse famous khana kya hai? 🍛",
];

function mockReply(persona: Persona, history: HistoryItem[]): ReplyResult {
  const last = history.at(-1)?.text.toLowerCase() ?? "";
  const turn = history.filter((m) => m.role === "user").length;
  if (/photo|pic|selfie|tasveer/.test(last) && persona.photos.length) {
    const photo = persona.photos[turn % persona.photos.length];
    return { ok: true, text: `Ye lo, abhi abhi li 📸 ${photo.caption}!\n[photo:${photo.id}]` };
  }
  return { ok: true, text: MOCK_LINES[turn % MOCK_LINES.length] };
}

// Server-side refusal fallback ("default" routing) is only available on these models.
const SUPPORTS_DEFAULT_FALLBACK = /^claude-(opus-5-5|sonnet-5-5|opus-5|fable-5-1)$/.test(CHAT_MODEL);

export type HistoryItem = { role: "user" | "assistant"; text: string; photoId: string | null };

export type ReplyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "refusal" | "empty" };

export async function generateReply(persona: Persona, history: HistoryItem[]): Promise<ReplyResult> {
  if (MOCK_LLM) return mockReply(persona, history);

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({
    role: m.role,
    // Keep photo tags in the history so the persona remembers what she already sent.
    content: m.photoId ? `${m.text}\n[photo:${m.photoId}]`.trim() : m.text,
  }));
  // The API requires the conversation to open with a user turn; threads start with the persona's greeting.
  if (messages[0]?.role !== "user") {
    messages.unshift({ role: "user", content: "(The user opened the chat.)" });
  }

  const response = await client.beta.messages.create({
    model: CHAT_MODEL,
    // Replies are a few sentences; this cap only guards against runaway cost.
    max_tokens: 2000,
    system: persona.systemPrompt,
    messages,
    output_config: { effort: CHAT_EFFORT },
    // Caches the system prompt + history prefix between turns of the same chat.
    cache_control: { type: "ephemeral" },
    ...(SUPPORTS_DEFAULT_FALLBACK
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  });

  if (response.stop_reason === "refusal") return { ok: false, reason: "refusal" };

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  return text ? { ok: true, text } : { ok: false, reason: "empty" };
}
