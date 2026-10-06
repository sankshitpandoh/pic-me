import type { ChatMessage } from "../../lib/api";
import { dayKey, dayLabel } from "./copy";

/** A message as the chat screen holds it: server copy + client-side delivery state. */
export type LocalMessage = ChatMessage & {
  /** Stable list key; survives the temp → server-copy swap so the bubble doesn't re-animate. */
  key: string;
  /** Only on my own messages that haven't been confirmed by the server. */
  status?: "pending" | "failed";
};

export type ChatRow =
  | { kind: "day"; key: string; label: string }
  | {
      kind: "msg";
      key: string;
      message: LocalMessage;
      /** First / last bubble of a run of consecutive messages from the same sender. */
      first: boolean;
      last: boolean;
    };

/** Bubbles from the same sender closer than this are grouped together. */
const GROUP_GAP_MS = 5 * 60 * 1000;

export function toLocal(m: ChatMessage): LocalMessage {
  return { ...m, key: `m${m.id}` };
}

/**
 * Builds rows (newest first — ready for an inverted FlatList) with day separators and grouping flags.
 */
export function buildRows(messages: LocalMessage[]): ChatRow[] {
  const now = new Date();
  const chrono: ChatRow[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const day = dayKey(m.createdAt);
    if (!prev || dayKey(prev.createdAt) !== day) {
      chrono.push({ kind: "day", key: `d${day}-${m.key}`, label: dayLabel(m.createdAt, now) });
    }
    const joins = (a: LocalMessage | undefined, b: LocalMessage | undefined) =>
      !!a &&
      !!b &&
      a.role === b.role &&
      dayKey(a.createdAt) === dayKey(b.createdAt) &&
      Math.abs(Date.parse(b.createdAt) - Date.parse(a.createdAt)) < GROUP_GAP_MS &&
      // A failed bubble always shows its own retry row.
      a.status !== "failed";
    chrono.push({ kind: "msg", key: m.key, message: m, first: !joins(prev, m), last: !joins(m, next) });
  }
  return chrono.reverse();
}
