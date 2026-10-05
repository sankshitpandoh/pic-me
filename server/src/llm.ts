import Anthropic from "@anthropic-ai/sdk";
import { CHAT_EFFORT, CHAT_MODEL } from "./config.ts";
import type { Persona } from "./personas.ts";

const client = new Anthropic();

// Server-side refusal fallback ("default" routing) is only available on these models.
const SUPPORTS_DEFAULT_FALLBACK = /^claude-(opus-5-5|sonnet-5-5|opus-5|fable-5-1)$/.test(CHAT_MODEL);

export type HistoryItem = { role: "user" | "assistant"; text: string; photoId: string | null };

export type ReplyResult =
  | { ok: true; text: string }
  | { ok: false; reason: "refusal" | "empty" };

export async function generateReply(persona: Persona, history: HistoryItem[]): Promise<ReplyResult> {
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
