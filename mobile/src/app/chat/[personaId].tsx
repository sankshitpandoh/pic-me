import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError, api, errorMessage, type ChatMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors } from "../../lib/theme";

export default function ChatScreen() {
  const { personaId } = useLocalSearchParams<{ personaId: string }>();
  const { credits, setCredits } = useAuth();
  const [name, setName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);

  useEffect(() => {
    api
      .messages(personaId)
      .then((res) => {
        setName(res.persona.name);
        setMessages(res.messages);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [personaId]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setOutOfCredits(false);
    // Show the message right away; replace it with the server's copy once the reply arrives.
    const tempId = -Date.now();
    setMessages((m) => [...m, { id: tempId, role: "user", text, photoUrl: null, createdAt: "" }]);
    setDraft("");
    try {
      const res = await api.send(personaId, text);
      setMessages((m) => [...m.filter((x) => x.id !== tempId), res.userMessage, res.reply]);
      setCredits(res.credits);
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      setDraft(text);
      if (err instanceof ApiError && err.code === "insufficient_credits") setOutOfCredits(true);
      else setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  // FlatList is inverted so the newest message sits at the bottom and the list opens scrolled there.
  const data = [...messages].reverse();

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <Pressable onPress={() => router.push("/wallet")} hitSlop={10}>
              <Text style={styles.credits}>💎 {credits}</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: 12, gap: 6 }}
            ListHeaderComponent={sending ? <Text style={styles.typing}>{name} is typing…</Text> : null}
            renderItem={({ item }) => (
              <MessageBubble message={item} onOpenPhoto={setViewer} />
            )}
          />
        )}

        {outOfCredits && (
          <Pressable style={styles.banner} onPress={() => router.push("/wallet")}>
            <Text style={styles.bannerText}>You're out of credits. Tap to recharge from ₹29 💎</Text>
          </Pressable>
        )}
        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendButton, (!draft.trim() || sending) && { opacity: 0.5 }]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            <Text style={styles.sendText}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewer} onPress={() => setViewer(null)}>
          {viewer && <Image source={{ uri: viewer }} style={styles.viewerImage} contentFit="contain" />}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function MessageBubble({ message, onOpenPhoto }: { message: ChatMessage; onOpenPhoto: (uri: string) => void }) {
  const mine = message.role === "user";
  return (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
      {message.photoUrl && (
        <Pressable onPress={() => onOpenPhoto(message.photoUrl!)}>
          <Image source={{ uri: message.photoUrl }} style={styles.photo} contentFit="cover" transition={150} />
        </Pressable>
      )}
      {message.text ? <Text style={[styles.text, mine && { color: "#fff" }]}>{message.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  credits: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  typing: { color: colors.textMuted, fontStyle: "italic", marginLeft: 4, marginBottom: 4 },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.bubbleTheirs,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { fontSize: 16, lineHeight: 22, color: colors.text },
  photo: { width: 220, height: 280, borderRadius: 12, marginBottom: 6 },
  banner: { backgroundColor: colors.primary, padding: 12, marginHorizontal: 12, borderRadius: 12 },
  bannerText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  error: { color: colors.danger, textAlign: "center", padding: 6 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontSize: 18 },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center" },
  viewerImage: { width: "100%", height: "80%" },
});
