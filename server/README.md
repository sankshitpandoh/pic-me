# Companion chat: API server

Node + TypeScript API for the PicMe companion app (`../mobile`). It handles phone OTP sign-up with an 18+ check, personas, chat (Claude), photos and prepaid credits (Razorpay).

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
photos:                   # optional; she can send these in chat
  - id: durga-puja
    file: kavya/puja.jpg
    caption: At the pandal for Durga Puja   # the model reads this to decide when to send it
---
You are Kavya, 23, ... (personality, backstory, likes, how she talks to the user)
```

- **To add a persona:** copy an existing file, change the `id`, and put her images in `media/<id>/`.
- **To tweak behavior for everyone** (message length, language matching, boundaries): edit `_base.md`. `{{name}}` and `{{photos}}` are filled in automatically. `<!-- comments -->` are stripped before the prompt goes to the model.
- **A broken file** (bad YAML, missing `id`/`name`/`age`, age under 18) is skipped with an error in the server log. The other personas keep working.
- Photos whose file is missing are left out of the prompt, so she won't try to send them.

### How photos work

The persona's prompt lists her photos by id and caption. When she wants to send one, the model writes `[photo:<id>]`. The server strips the tag, attaches the image, and charges `creditsPerPhoto`. If the user can't afford the photo, the text still goes through without it. All photos are pre-made images you upload, never generated on the fly. That keeps them safe-for-work and keeps cost predictable.

## Pricing

Edit `config/pricing.json` (re-read on every request):

```json
{ "signupBonusCredits": 20, "creditsPerMessage": 1, "creditsPerPhoto": 3,
  "packs": [{ "id": "pack_49", "priceInr": 49, "credits": 65, "label": "Popular" }] }
```

Credits are deducted before the model is called and refunded automatically if the call fails or the model declines. Every change is logged in the `credit_ledger` table.

### Model cost vs. pack price

`CHAT_MODEL` defaults to `claude-opus-5-5` ($4 input / $20 output per million tokens). A typical turn sends the system prompt plus up to `HISTORY_LIMIT` past messages (prompt caching makes repeat history cheap) and gets a short reply. Measure real per-message cost from your Anthropic usage dashboard before you fix pack prices: at ₹49 for 65 messages you earn roughly ₹0.75 per message, before the payment gateway's fee. If that margin doesn't hold, set `CHAT_MODEL=claude-haiku-4-5` ($1 / $5) and/or lower `HISTORY_LIMIT`. Nothing else needs to change.

## Payments (Razorpay)

1. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `.env`.
2. In the Razorpay dashboard, add a webhook for `payment.captured` pointing to `https://<your-api>/webhooks/razorpay`.
3. Wire Razorpay Checkout into `mobile/src/app/wallet.tsx` (see the TODO there; it needs `react-native-razorpay` and a development build).

Flow: app → `POST /wallet/orders` → Razorpay Checkout → `POST /wallet/orders/verify` (HMAC-checked). The webhook is a backup for when the app closes mid-payment. Credits are added once per order, however many times either path runs.

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/otp/request` | `{ phone }` |
| POST | `/auth/otp/verify` | `{ phone, code, dob? }`; new users need `dob` (YYYY-MM-DD, 18+) |
| POST | `/auth/logout` | |
| GET | `/me` | Bearer token required from here down |
| GET | `/personas` | |
| GET | `/chats/:personaId/messages` | Creates the greeting on first open |
| POST | `/chats/:personaId/messages` | `{ text }` → `{ userMessage, reply, credits }`; 402 when out of credits |
| GET | `/wallet` | Balance, packs, rates |
| POST | `/wallet/orders` | `{ packId }` → Razorpay order |
| POST | `/wallet/orders/verify` | `{ orderId, paymentId, signature }` |
| POST | `/wallet/dev-topup` | Dev only |
| POST | `/webhooks/razorpay` | Razorpay webhook |

## Before launch

- **SMS:** implement `sendSms` in `src/auth.ts` with a DLT-registered provider (MSG91, Twilio Verify, Firebase Auth).
- **Hosting:** SQLite on one server is fine to start. Move to Postgres when you run more than one instance.
- **Rate limiting:** add per-IP limits on `/auth/*` (e.g. `express-rate-limit`) to stop OTP spam.
- **Play Store:** you'll need a privacy policy, account deletion, and a content rating declaring an AI chat app with user-generated content. The 18+ gate and AI disclosure on the sign-up screen help here.
