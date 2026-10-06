# Companion chat: API server

Node + TypeScript API for the Playmate companion app (`../mobile`). It handles phone OTP sign-up with an 18+ check, personas, chat (Claude), unlockable photos, daily free messages with streak bonuses, and prepaid credits (Razorpay).

## Run it

```bash
cd server
cp .env.example .env     # add ANTHROPIC_API_KEY
npm install
npm run dev              # http://localhost:4000, reloads on code changes
npm test                 # unit tests
npm run typecheck
```

Requires Node 22.13+ (uses the built-in `node:sqlite`; the database is created at `data/app.db`).

In development:
- The OTP is printed in the server log and returned to the app as `devCode`, so no SMS provider is needed.
- The wallet screen grants credits for free (`/wallet/dev-topup`) when Razorpay keys are empty.

Set `NODE_ENV=production` to turn both off.

## Personas: adding and editing

Each persona is one Markdown file in `personas/`. **Edits take effect on the next message; no restart needed.**

```
personas/
  _base.md        shared rules added to every persona (tone, boundaries, photo instructions)
  priya.md        one file per persona
  ananya.md
  meera.md
  media/          images: media/<persona-id>/avatar.jpg, media/<persona-id>/<photo>.jpg
```

A persona file has settings at the top and the system prompt below:

```markdown
---
id: kavya                 # lowercase, used in URLs; don't change once users have chats
name: Kavya
age: 23                   # must be 18 or above, otherwise the file is rejected
city: Kolkata
languages: [Bengali, Hinglish]
tagline: Shown on the persona list
avatar: kavya/avatar.jpg  # optional; shows her initial if the file is missing
enabled: true             # false hides her from the app without deleting chats
sortOrder: 4              # position in the list
greeting: "First message she sends when a chat opens"
vibe: "Mishti doi aur adda? 😄"   # optional; one line in her own voice (defaults to tagline)
tags: [Foodie 🍲, Adda ☕]          # optional; mood chips on her card (default: none)
starters:                         # optional; quick replies offered to the user
  - Aaj ka plan kya hai?          #   (default: "Kya kar rahi ho?", "Tumhara din kaisa tha?")
accent: ["#FF8A5B", "#FF3D7F"]    # optional; two #RRGGBB colors for her card, else the app default
photos:                   # optional; she can send these in chat
  - id: durga-puja
    file: kavya/puja.jpg
    caption: At the pandal for Durga Puja   # the model reads this to decide when to send it
---
You are Kavya, 23, ... (personality, backstory, likes, how she talks to the user)
```

- **To add a persona:** copy an existing file, change the `id`, and put her images in `media/<id>/`.
- **To tweak behavior for everyone** (message length, language matching, boundaries): edit `_base.md`. `{{name}}` and `{{photos}}` are filled in automatically. `<!-- comments -->` are stripped before the prompt goes to the model.
- A malformed `accent` (not exactly two `#RRGGBB` colors) is ignored with a warning; the rest of the file still loads.
- **A broken file** (bad YAML, missing `id`/`name`/`age`, age under 18) is skipped with an error in the server log. The other personas keep working.
- Photos whose file is missing are left out of the prompt, so she won't try to send them.

### How photos work

The persona's prompt lists her photos by id and caption. When she wants to send one, the model writes `[photo:<id>]`. The server strips the tag and attaches the photo to the reply **locked**: the app shows the caption and the unlock price (`creditsPerPhoto`), and the image URL is only returned after the user unlocks it with `POST /chats/:personaId/messages/:messageId/unlock`. Unlocking charges once; unlocking the same message again is free. The tag stays in the model's history so she remembers what she sent. All photos are pre-made images you upload, never generated on the fly. That keeps them safe-for-work and keeps cost predictable.

## Pricing

Edit `config/pricing.json` (re-read on every request):

```json
{
  "signupBonusCredits": 20,
  "creditsPerMessage": 1,
  "creditsPerPhoto": 3,
  "freeMessagesPerDay": 5,
  "streakBonuses": { "3": 5, "7": 15 },
  "packs": [
    { "id": "pack_10", "priceInr": 10, "credits": 12, "label": "Chhota", "badge": null },
    { "id": "pack_29", "priceInr": 29, "credits": 36, "label": "Starter", "badge": null },
    { "id": "pack_49", "priceInr": 49, "credits": 65, "label": "Sabse Popular", "badge": "popular" },
    { "id": "pack_99", "priceInr": 99, "credits": 140, "label": "Paisa Vasool", "badge": "best" }
  ],
  "firstPurchaseOffer": { "id": "offer_first", "priceInr": 19, "credits": 50, "label": "Pehla Recharge Offer" }
}
```

- `badge` is `"popular"`, `"best"` or `null`. The API adds `approxMessages` (`credits / creditsPerMessage`, rounded down) to each pack.
- **First-purchase offer:** shown (with badge `"offer"`) and purchasable until the user has a paid order, or has used it once through dev top-up.
- **Daily free messages:** each user gets `freeMessagesPerDay` messages per day before credits are spent. Days run midnight to midnight IST (Asia/Kolkata).
- **Streaks:** the first successful message of each IST day extends the streak if the user also chatted yesterday, otherwise it restarts at 1. When the streak reaches a length listed in `streakBonuses`, that many credits are added (ledger reason `streak_bonus`) and returned as `streakBonus`. A streak that missed a day reads as 0.

A message is paid from a free message if any are left today, otherwise with credits, before the model is called. If the call fails or the model declines, the same bucket is refunded automatically. Every credit change is logged in the `credit_ledger` table; free-message use is in `daily_usage`.

### Model cost vs. pack price

`CHAT_MODEL` defaults to `claude-opus-5-5` ($4 input / $20 output per million tokens). A typical turn sends the system prompt plus up to `HISTORY_LIMIT` past messages (prompt caching makes repeat history cheap) and gets a short reply. Measure real per-message cost from your Anthropic usage dashboard before you fix pack prices: at ₹49 for 65 messages you earn roughly ₹0.75 per message, before the payment gateway's fee. Free daily messages also cost a model call each, so budget for `freeMessagesPerDay` × daily active users. If that margin doesn't hold, set `CHAT_MODEL=claude-haiku-4-5` ($1 / $5) and/or lower `HISTORY_LIMIT`. Nothing else needs to change.

## Payments (Razorpay)

1. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `.env`.
2. In the Razorpay dashboard, add a webhook for `payment.captured` pointing to `https://<your-api>/webhooks/razorpay`.
3. Wire Razorpay Checkout into `mobile/src/app/wallet.tsx` (see the TODO there; it needs `react-native-razorpay` and a development build).

Flow: app → `POST /wallet/orders` → Razorpay Checkout → `POST /wallet/orders/verify` (HMAC-checked). The webhook is a backup for when the app closes mid-payment. Credits are added once per order, however many times either path runs.

## API

Types used below (timestamps are ISO-8601 UTC, e.g. `2026-10-06T05:15:32Z`):

```ts
type WalletSummary = { credits: number; freeLeftToday: number; freePerDay: number; streak: number };
type Me = { id: number; phone: string } & WalletSummary;
type PhotoInfo = { id: string; caption: string; locked: boolean; url: string | null; cost: number };
type ChatMessage = { id: number; role: "user" | "assistant"; text: string; createdAt: string; photo: PhotoInfo | null };
type PersonaSummary = {
  id: string; name: string; age: number; city: string; languages: string[];
  tagline: string; vibe: string; tags: string[]; accent: [string, string] | null;
  avatarUrl: string | null; greeting: string; online: boolean;
  lastMessage: { text: string; role: "user" | "assistant"; createdAt: string; hasPhoto: boolean } | null;
  unread: number;
};
type PersonaDetail = PersonaSummary & { starters: string[]; photoCount: number };
type Pack = { id: string; priceInr: number; credits: number; label: string; badge: "popular" | "best" | "offer" | null; approxMessages: number };
```

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/otp/request` | `{ phone }` |
| POST | `/auth/otp/verify` | `{ phone, code, dob? }` → `{ token, user: Me }`; new users need `dob` (YYYY-MM-DD, 18+) |
| POST | `/auth/logout` | |
| GET | `/me` | → `Me`. Bearer token required from here down |
| DELETE | `/me` | Deletes the account and all its data → `{ ok: true }` |
| GET | `/personas` | → `PersonaSummary[]`; chats with history first (latest on top), then by `sortOrder` |
| GET | `/chats/:personaId/messages` | → `{ persona: PersonaDetail, messages: ChatMessage[] }`; creates the greeting on first open, marks the chat read |
| POST | `/chats/:personaId/messages` | `{ text }` → `{ userMessage, reply, wallet, streakBonus }`; 402 `{ error: "insufficient_credits", wallet }` |
| POST | `/chats/:personaId/messages/:messageId/unlock` | → `{ message, wallet }`; charges `creditsPerPhoto` once; 402 as above; 404 if not her photo message |
| DELETE | `/chats/:personaId` | Clears that chat → `{ ok: true }` |
| GET | `/wallet` | `WalletSummary` + `{ creditsPerMessage, creditsPerPhoto, packs, offer, razorpayKeyId, devTopupEnabled }` |
| POST | `/wallet/orders` | `{ packId }` (a pack or the eligible offer) → Razorpay order |
| POST | `/wallet/orders/verify` | `{ orderId, paymentId, signature }` → `{ wallet }` |
| POST | `/wallet/dev-topup` | `{ packId }` → `{ wallet }`. Dev only |
| POST | `/webhooks/razorpay` | Razorpay webhook |

## Before launch

- **SMS:** implement `sendSms` in `src/auth.ts` with a DLT-registered provider (MSG91, Twilio Verify, Firebase Auth).
- **Hosting:** SQLite on one server is fine to start. Move to Postgres when you run more than one instance.
- **Rate limiting:** add per-IP limits on `/auth/*` (e.g. `express-rate-limit`) to stop OTP spam.
- **Play Store:** you'll need a privacy policy and a content rating declaring an AI chat app with user-generated content. The 18+ gate, AI disclosure on the sign-up screen and `DELETE /me` (account deletion) help here.
