/** Chat-screen-only copy (Roman Hinglish). Shared strings live in `lib/strings.ts` (`t.chat`). */
export const chatCopy = {
  today: "Aaj",
  yesterday: "Kal",
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ai: "AI",
  perMessage: "1 💎 per message",
  retry: "Dobara bhejo",
  failed: "Nahi gaya",
  recharge: "Recharge",
  dismiss: "Hatao",
  streakBonus: "🔥 Streak bonus +{n} 💎!",
  photoHint: "unlock pe {cost} 💎",
  photoCaption: "“{caption}”",
  photoLockedTitle: "Ek photo bheji hai",
  photoLockedSub: "Sirf tum dekh sakte ho",
  unlocking: "Khul rahi hai…",
  closeViewer: "Photo band karo",
  openPhoto: "Photo bada karke dekho",
  info: {
    aboutHer: "Uske baare mein",
    clear: "Chat clear karo",
    clearConfirm: "Pakka? Saari baatein mit jayengi",
    clearYes: "Haan, clear karo",
    aiNote: "{name} ek AI character hai — asli insaan nahi. Baatein private rehti hain 🔒",
    ageCity: "{age} · {city}",
    speaks: "Bolti hai: {langs}",
  },
  intro: "Yeh {name} ke saath tumhari private chat hai 💬",
  send: "Message bhejo",
  back: "Wapas",
  creditsLabel: "Recharge karo",
} as const;

const MONTHS = chatCopy.months;

/** "9:41 pm" in the device's local time. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${ampm}`;
}

/** Local calendar-day key, e.g. "2026-10-6". */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Aaj" / "Kal" / "12 Oct" (adds the year when it isn't this year). */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return chatCopy.today;
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86_400_000);
  if (diff <= 0) return chatCopy.today;
  if (diff === 1) return chatCopy.yesterday;
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Does this starter ask for a photo? */
export function isPhotoStarter(s: string): boolean {
  return /photo|pic|selfie|tasveer|📸/i.test(s);
}
