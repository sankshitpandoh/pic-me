# PicMe mobile app

Expo (SDK 57) + Expo Router app for the companion chat. The API lives in `../server`.

## Run it

```bash
cd mobile
npm install
cp .env.example .env     # set EXPO_PUBLIC_API_URL
npx expo start           # press a for Android, w for web
```

On a physical phone (Expo Go), `localhost` points at the phone itself. Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, e.g. `http://192.168.1.20:4000`.

## Screens (`src/app/`)

| File | Screen |
|---|---|
| `login.tsx` | Phone → OTP → date of birth + 18+ and AI-disclosure checkbox (new users only) |
| `index.tsx` | Persona list, credits pill (taps through to wallet), logout |
| `chat/[personaId].tsx` | Chat with typing indicator, photo messages (tap to enlarge), out-of-credits banner |
| `wallet.tsx` | Balance and recharge packs |

API client: `src/lib/api.ts`. Session storage: `src/lib/auth.tsx` (SecureStore on device, localStorage on web). Colors: `src/lib/theme.ts`.

## Checks

```bash
npm run typecheck
npx expo-doctor
```

## Payments

`wallet.tsx` already creates Razorpay orders on the server. Opening Razorpay Checkout needs `react-native-razorpay`, a native module, so it won't run in Expo Go. Build a development client (`npx expo run:android` or `eas build --profile development`) and fill in the TODO in `wallet.tsx`.
