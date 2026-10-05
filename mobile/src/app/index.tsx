import { Link, Stack, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../components/Avatar";
import { api, errorMessage, type Persona } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

export default function PersonaListScreen() {
  const { credits, setCredits, signOut } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, me] = await Promise.all([api.personas(), api.me()]);
      setPersonas(list);
      setCredits(me.credits);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [setCredits]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={signOut} hitSlop={10}>
              <Text style={styles.headerLink}>Logout</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Link href="/wallet" asChild>
              <Pressable style={styles.creditsPill} hitSlop={10}>
                <Text style={styles.creditsText}>💎 {credits}</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        data={personas}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            onPress={() => router.push({ pathname: "/chat/[personaId]", params: { personaId: item.id } })}
          >
            <Avatar name={item.name} uri={item.avatarUrl} size={60} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.name}, {item.age}
              </Text>
              <Text style={styles.meta}>
                📍 {item.city} · {item.languages.join(", ")}
              </Text>
              <Text style={styles.tagline} numberOfLines={2}>
                {item.tagline}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerLink: { color: colors.textMuted, fontSize: 15 },
  creditsPill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  creditsText: { color: "#fff", fontWeight: "700" },
  card: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 18, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  tagline: { fontSize: 14, color: colors.text, marginTop: 4 },
  error: { color: colors.danger, marginBottom: 8 },
});
