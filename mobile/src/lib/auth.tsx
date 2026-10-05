import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { api, setAuthToken, setUnauthorizedHandler } from "./api";

const TOKEN_KEY = "auth_token";

// SecureStore is native-only; fall back to localStorage so the app also runs in a browser during development.
const storage = {
  get: (): Promise<string | null> =>
    Platform.OS === "web" ? Promise.resolve(localStorage.getItem(TOKEN_KEY)) : SecureStore.getItemAsync(TOKEN_KEY),
  set: (v: string) =>
    Platform.OS === "web" ? Promise.resolve(localStorage.setItem(TOKEN_KEY, v)) : SecureStore.setItemAsync(TOKEN_KEY, v),
  clear: () =>
    Platform.OS === "web" ? Promise.resolve(localStorage.removeItem(TOKEN_KEY)) : SecureStore.deleteItemAsync(TOKEN_KEY),
};

type AuthState = {
  ready: boolean;
  signedIn: boolean;
  credits: number;
  setCredits: (n: number) => void;
  signIn: (token: string, credits: number) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [credits, setCredits] = useState(0);

  const signOut = useCallback(async () => {
    api.logout().catch(() => {});
    setAuthToken(null);
    await storage.clear();
    setSignedIn(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      storage.clear();
      setSignedIn(false);
    });
    (async () => {
      const token = await storage.get();
      if (token) {
        setAuthToken(token);
        try {
          const me = await api.me();
          setCredits(me.credits);
          setSignedIn(true);
        } catch {
          // 401 is handled by the unauthorized handler; offline keeps the user signed in.
          setSignedIn(Boolean(await storage.get()));
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (token: string, initialCredits: number) => {
    await storage.set(token);
    setAuthToken(token);
    setCredits(initialCredits);
    setSignedIn(true);
  }, []);

  const value = useMemo(
    () => ({ ready, signedIn, credits, setCredits, signIn, signOut }),
    [ready, signedIn, credits, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
