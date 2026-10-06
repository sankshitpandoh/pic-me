import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { api, errorMessage, type PersonaSummary } from "../../lib/api";
import { useAuth } from "../../lib/auth";

/**
 * Persona list for the home tabs. Re-fetches (silently) on every tab focus, exposes pull-to-refresh,
 * and refreshes the wallet alongside so the streak / credits stay current.
 */
export function usePersonas() {
  const { refreshWallet } = useAuth();
  const [personas, setPersonas] = useState<PersonaSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inflight = useRef(false);

  const load = useCallback(
    async (mode: "silent" | "pull" | "retry" = "silent") => {
      if (inflight.current && mode === "silent") return;
      inflight.current = true;
      if (mode === "pull") setRefreshing(true);
      if (mode === "retry") {
        setError(null);
        setPersonas(null);
      }
      try {
        const [list] = await Promise.all([api.personas(), refreshWallet()]);
        setPersonas(list);
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        inflight.current = false;
        setRefreshing(false);
      }
    },
    [refreshWallet],
  );

  useFocusEffect(
    useCallback(() => {
      load("silent");
    }, [load]),
  );

  const refresh = useCallback(() => load("pull"), [load]);
  const retry = useCallback(() => load("retry"), [load]);

  return { personas, setPersonas, error, refreshing, refresh, retry };
}
