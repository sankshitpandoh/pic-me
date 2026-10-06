# Playmate mobile app

Expo (SDK 57) + Expo Router app for the companion chat. The API lives in `../server`.

## Run it

```bash
cd mobile
npm install
cp .env.example .env     # set EXPO_PUBLIC_API_URL
npx expo start           # press a for Android, w for web
```

On a physical phone (Expo Go), `localhost` points at the phone itself. Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, e.g. `http://192.168.1.20:4000`.

## Structure (`src/`)

Dark-first "after-dark lounge" UI. Fonts: Baloo 2 (display) + Mukta (body). Copy is Roman Hinglish.

| Path | What |
|---|---|
| `app/_layout.tsx` | Root stack: fonts + splash, dark nav theme, auth guards (`(tabs)` + `chat/[personaId]` when signed in, `login` otherwise) |
| `app/(tabs)/_layout.tsx` | Bottom tabs: Chats (`index`), Discover, Recharge (`wallet`), Profile |
| `app/login.tsx` | Phone → OTP → date of birth + 18+ / AI-disclosure consent |
| `app/chat/[personaId].tsx` | Chat |
| `lib/theme.ts` | Design tokens: `colors`, `gradients`, `personaGradient()`, `fonts`, `type`, `space`, `radii`, `shadows`, `motion` |
| `lib/strings.ts` | All UI copy (`t`) + `fmt()` for `{placeholders}` |
| `lib/api.ts` | Typed API client + `errorMessage()` |
| `lib/auth.tsx` | Session + `wallet` state (`useAuth()`) — SecureStore on device, localStorage on web |
| `components/` | Shared UI: `AppText`, `Avatar`, `GradientButton`, `CreditsPill`, `Chip`, `TypingDots`, `BottomSheet`, `PressableScale`, `GlowBackground`, `ScreenState` |

Animations use React Native's `Animated` with `useNativeDriver: true` (no reanimated / blur, to stay light on budget Android phones). Never set `fontWeight` with the custom fonts — use `<AppText variant>` or `fonts.*`.

## Checks

```bash
npm run typecheck
npx expo-doctor
```

## Payments

The Recharge tab (`app/(tabs)/wallet.tsx`) creates Razorpay orders on the server. Opening Razorpay Checkout needs `react-native-razorpay`, a native module, so it won't run in Expo Go. Build a development client (`npx expo run:android` or `eas build --profile development`) and wire Checkout into the Recharge tab.
