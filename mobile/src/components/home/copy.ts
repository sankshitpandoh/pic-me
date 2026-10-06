/** Local copy + small formatting helpers for the home tabs (Chats, Discover, Profile). Roman Hinglish. */

export const homeCopy = {
  greeting: {
    morning: "Good morning ☀️",
    afternoon: "Namaste 🌤️",
    evening: "Shubh sandhya 🌙",
    night: "Raat ho gayi 🌙",
  },
  greetingSub: {
    morning: "Chai pi li? Koi aapka intezaar kar rahi hai",
    afternoon: "Lunch ke baad thodi gupshup ho jaaye?",
    evening: "Din kaisa gaya? Kisi ko batao na",
    night: "Neend nahi aa rahi? Woh abhi jaag rahi hain",
  },
  streak: "{n} din ki streak",
  streakStart: "Aaj se streak shuru karo",
  streakHint: "Roz aao, streak badhao 🎁",
  freeLeft: "Aaj {n} free messages bache",
  freeNone: "Aaj ke free messages ho gaye · kal phir milenge",
  stories: "Sab yahan hain",
  storiesOnline: "{n} online",
  conversations: "Aapki baatein",
  aiTag: "AI",
  you: "Aap: ",
  photo: "📸 Photo",
  yesterday: "Kal",
  emptyTitle: "Pehli baat ka intezaar hai",
  emptyMessage: "Abhi koi chat shuru nahi hui. Upar kisi pe tap karo, ya Discover mein sabse milo.",
  emptyCta: "Discover mein milo",
  openChat: "{name} se chat kholo",
  unreadA11y: "{n} naye messages",

  // Discover
  all: "All ✨",
  discoverHeading: "Aaj kisse milna hai?",
  discoverSub: "{n} ladkiyan aapka intezaar kar rahi hain",
  noMatch: "Is bhasha mein abhi koi nahi. Doosri try karo 🙂",
  online: "online",
  aiCharacter: "AI character",
  languages: "Bolti hai",
  sayHi: "Pehla message",
  talkTo: "{name} se baat karo 💬",
  interests: "Pasand",

  // Profile
  phoneLabel: "Aapka number",
  member: "Playmate member 💖",
  streakTile: "Streak",
  streakDays: "{n} din",
  creditsTile: "Credits",
  freeTile: "Aaj free",
  sectionWallet: "Wallet",
  recharge: "Recharge karo",
  rechargeSub: "₹10 se shuru · 💎 kabhi expire nahi",
  sectionPrivacy: "Privacy",
  privacyTitle: "Hamara vaada 🔒",
  sectionAccount: "Account",
  deleteChatsSub: "Sabki baatein mit jaayengi",
  logoutSub: "Phir kabhi bhi wapas aao",
  deleteAccountSub: "Hamesha ke liye — wapas nahi aayega",
  sectionHelp: "Madad",
  help: "Help / Shikayat",
  helpEmail: "support@playmate.app",
  version: "App version",

  confirmChatsTitle: "Saari chats delete karein?",
  confirmChatsBody: "Sabhi ke saath ki baatein aur photos hamesha ke liye mit jaayengi. Aapke 💎 safe rahenge.",
  confirmChatsCta: "Haan, sab delete karo",
  confirmChatsNone: "Delete karne ke liye koi chat hi nahi hai 🙂",
  chatsDeleted: "Saari chats delete ho gayi ✓",
  confirmLogoutTitle: "Logout karna hai?",
  confirmLogoutBody: "Aapki chats aur 💎 safe rahenge. Isi number se wapas login karke sab mil jaayega.",
  confirmLogoutCta: "Haan, logout karo",
  confirmDeleteTitle: "Account hamesha ke liye delete?",
  confirmDeleteBody:
    "Aapka number, saari chats, photos aur bache hue 💎 hamesha ke liye delete ho jaayenge. Yeh wapas nahi ho sakta, aur bache 💎 ka refund nahi milega.",
  confirmDeleteCta: "Haan, account delete karo",
} as const;

/** Softer-than-default top glow for the home tabs (sits right under the opaque tab header). */
export const HOME_GLOW = ["rgba(244,63,127,0.11)", "rgba(154,47,192,0.05)", "rgba(15,10,18,0)"] as const;

export type DayPart = keyof typeof homeCopy.greeting;

export function dayPart(d = new Date()): DayPart {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** WhatsApp-style relative time: "2:45 pm" today, "Kal", weekday within a week, else "12 Sep". */
export function relativeTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) {
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  }
  if (days === 1) return homeCopy.yesterday;
  if (days < 7) return DAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "+919876543210" → "+91 98•••• 3210". */
export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const local = digits.slice(-10);
  if (local.length < 10) return phone ?? "";
  return `+91 ${local.slice(0, 2)}•••• ${local.slice(-4)}`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
