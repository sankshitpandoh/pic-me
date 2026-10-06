/**
 * All user-facing copy (Roman Hinglish), grouped by screen.
 * Strings with `{placeholders}` are filled with `fmt`: `fmt(t.chat.typing, { name: "Priya" })`.
 */
export const t = {
  brand: "Playmate",
  common: {
    retry: "Phir se try karo",
    loading: "Ek sec…",
    cancel: "Rehne do",
    ok: "Theek hai",
    close: "Band karo",
    continue: "Aage badho",
    comingSoon: "Jaldi aa raha hai ✨",
    credits: "{n} credits",
    gem: "💎",
  },
  login: {
    tagline: "Koi hai jo sunti hai, hamesha 💬",
    phoneLabel: "Apna number daalo",
    phonePlaceholder: "98765 43210",
    sendOtp: "OTP bhejo",
    otpLabel: "+91 {phone} pe 6-digit code aaya hoga",
    resend: "Dobara bhejo",
    resendIn: "{s} sec mein dobara bhej sakte ho",
    dobTitle: "Ek aakhri baat",
    dobLabel: "Janamdin",
    consent: "Main 18+ hoon aur samajhta hoon ki yahan sab AI characters hain, asli log nahi.",
    continue: "Chalo shuru karein 🎉",
    changeNumber: "Number badlo",
    trust: "🔒 Number kisi ko nahi dikhega. Chats private hain.",
  },
  tabs: {
    chats: "Chats",
    discover: "Discover",
    wallet: "Recharge",
    profile: "Profile",
  },
  chats: {
    title: "Kisse baat karni hai?",
    empty: "Abhi koi baat shuru nahi hui. Discover mein kisi se milo 👋",
  },
  discover: {
    title: "Discover",
  },
  chat: {
    placeholder: "Kuch bolo na…",
    typing: "{name} likh rahi hai…",
    online: "online",
    aiTag: "AI character",
    photoLocked: "📸 {caption}",
    unlock: "Dekho · {cost} 💎",
    lowBalance: "Sirf {n} 💎 bache hain, recharge kar lo?",
    outOfCredits: "Arre, 💎 khatam! ₹10 se baat jaari rakho →",
    freeLeft: "Aaj {n} free messages bache",
    streak: "🔥 {n} din",
  },
  wallet: {
    title: "💎 Recharge",
    balance: "Aapke 💎",
    rate: "1 💎 = 1 message · 3 💎 = 1 photo",
    approx: "~{n} baatein",
    popular: "⭐ Sabse Popular",
    best: "💰 Paisa Vasool",
    offer: "🎁 Pehla Recharge Offer",
    footnote: "UPI / card se safe payment. 💎 kabhi expire nahi honge.",
    success: "Ho gaya! +{n} 💎 add hue 🎉",
  },
  profile: {
    title: "Profile",
    logout: "Logout karo",
    deleteChats: "Saari chats delete karo",
    deleteAccount: "Account delete karo",
    privacy: "Aapki chats private hain. Hum kuch post nahi karte.",
  },
  errors: {
    invalid_phone: "10 digit ka sahi number daalo",
    otp_cooldown: "Thoda ruko, 30 sec baad naya OTP milega",
    otp_invalid: "OTP galat hai, ek baar check karo",
    otp_expired: "OTP purana ho gaya, naya mangao",
    invalid_dob: "Sahi janamdin daalo",
    underage: "Maaf kijiye, yeh app sirf 18+ ke liye hai.",
    insufficient_credits: "Arre, 💎 khatam! Recharge karke baat jaari rakho.",
    busy_try_again: "Woh abhi thodi busy hai, ek min mein try karo 🙈",
    reply_failed: "Message nahi gaya 😕 Dobara bhejo",
    payments_not_configured: "Payment abhi band hai, thodi der mein aao",
    network: "Internet slow lag raha hai, check karo 📶",
    generic: "Kuch gadbad ho gayi, phir se try karo",
  },
} as const;

/** Fills `{key}` placeholders: `fmt("Aaj {n} free", { n: 3 })` → "Aaj 3 free". Unknown keys are left as-is. */
export function fmt(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
