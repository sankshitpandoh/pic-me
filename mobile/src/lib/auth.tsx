import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Platform } from "react-native";
import { api, setAuthToken, setUnauthorizedHandler, type Me, type WalletSummary } from "./api";

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

const EMPTY_WALLET: WalletSummary = { credits: 0, freeLeftToday: 0, freePerDay: 0, streak: 0 };

type AuthState = {
  /** False until the stored token has been checked — the root layout keeps the splash up meanwhile. */
  ready: boolean;
  signedIn: boolean;
  /** The signed-in user's id + phone (null when signed out or offline at startup). */
  user: Pick<Me, "id" | "phone"> | null;
  /** Latest known balance / free messages / streak. Update it from every API response that returns `wallet`. */
  wallet: WalletSummary;
  /** Accepts a value or an updater, like React's setState. */
  setWallet: Dispatch<SetStateAction<WalletSummary>>;
  /** Convenience alias for `wallet.credits`. */
  credits: number;
  /** Re-fetches `/me` and updates `wallet` (e.g. on screen focus). Errors are swallowed. */
  refreshWallet: () => Promise<void>;
  signIn: (token: string, user: Me) => Promise<void>;
  signOut: () => Promise<void>;
};

function toWallet(me: Me): WalletSummary {
  return { credits: me.credits, freeLeftToday: me.freeLeftToday, freePerDay: me.freePerDay, streak: me.streak };
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<Pick<Me, "id" | "phone"> | null>(null);
  const [wallet, setWallet] = useState<WalletSummary>(EMPTY_WALLET);

  const signOut = useCallback(async () => {
    api.logout().catch(() => {});
    setAuthToken(null);
    await storage.clear();
    setSignedIn(false);
    setUser(null);
    setWallet(EMPTY_WALLET);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      storage.clear();
      setSignedIn(false);
      setUser(null);
      setWallet(EMPTY_WALLET);
    });
    (async () => {
      const token = await storage.get();
      if (token) {
        setAuthToken(token);
        try {
          const me = await api.me();
          setUser({ id: me.id, phone: me.phone });
          setWallet(toWallet(me));
          setSignedIn(true);
        } catch {
          // 401 is handled by the unauthorized handler; offline keeps the user signed in.
          setSignedIn(Boolean(await storage.get()));
        }
      }
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (token: string, me: Me) => {
    await storage.set(token);
    setAuthToken(token);
    setUser({ id: me.id, phone: me.phone });
    setWallet(toWallet(me));
    setSignedIn(true);
  }, []);

  const refreshWallet = useCallback(async () => {
    try {
      const me = await api.me();
      setUser({ id: me.id, phone: me.phone });
      setWallet(toWallet(me));
    } catch {
      // Offline or signed out (401 handler takes care of the latter).
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      signedIn,
      user,
      wallet,
      setWallet,
      credits: wallet.credits,
      refreshWallet,
      signIn,
      signOut,
    }),
    [ready, signedIn, user, wallet, refreshWallet, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
