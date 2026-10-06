import { DarkTheme, Stack, ThemeProvider, type Theme } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import { useAppFonts } from "../lib/fonts";
import { colors, fonts } from "../lib/theme";

// Keep the native splash up until fonts + stored session are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});
// Root window color behind every screen (prevents white flashes during transitions / keyboard).
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

/** React Navigation theme so default headers, cards and tab bars are dark too. */
const navTheme: Theme = {
  ...DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: fonts.body, fontWeight: "normal" },
    medium: { fontFamily: fonts.bodyMedium, fontWeight: "normal" },
    bold: { fontFamily: fonts.bodyBold, fontWeight: "normal" },
    heavy: { fontFamily: fonts.displayHeavy, fontWeight: "normal" },
  },
};

function RootStack() {
  const { ready, signedIn } = useAuth();
  const fontsReady = useAppFonts();
  const appReady = ready && fontsReady;

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  if (!appReady) return null; // native splash is still showing

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[personaId]" options={{ title: "" }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={navTheme}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}
