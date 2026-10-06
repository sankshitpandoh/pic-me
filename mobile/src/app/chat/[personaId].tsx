import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "../../components/AppText";
import { Avatar } from "../../components/Avatar";
import { ChatHeaderTitle } from "../../components/chat/ChatHeader";
import { Composer } from "../../components/chat/Composer";
import { chatCopy } from "../../components/chat/copy";
import { LowBalanceNudge } from "../../components/chat/LowBalanceNudge";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { buildRows, toLocal, type ChatRow, type LocalMessage } from "../../components/chat/model";
import { PersonaSheet } from "../../components/chat/PersonaSheet";
import { PhotoViewer } from "../../components/chat/PhotoViewer";
import { QuickReplies } from "../../components/chat/QuickReplies";
import { Toast } from "../../components/chat/Toast";
import { CreditsPill, LOW_CREDITS } from "../../components/CreditsPill";
import { GlowBackground } from "../../components/GlowBackground";
import { ScreenState } from "../../components/ScreenState";
import { TypingDots } from "../../components/TypingDots";
import { RechargeSheet } from "../../components/wallet/RechargeSheet";
import { api, errorMessage, isOutOfCredits, walletFromError, type PersonaDetail, type WalletSummary } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { haptic } from "../../lib/haptics";
import { fmt, t } from "../../lib/strings";
import { colors, personaGradient, radii, space, withAlpha } from "../../lib/theme";

type RechargeReason = "out_of_credits" | "low_balance" | "photo";
type ToastState = { id: number; message: string; tone: "celebrate" | "error" } | null;

const DEFAULT_PHOTO_COST = 3;

export default function ChatScreen() {
  const { personaId } = useLocalSearchParams<{ personaId: string }>();
  const { wallet, setWallet } = useAuth();
  const headerHeight = useHeaderHeight();

  const [persona, setPersona] = useState<PersonaDetail | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [awaiting, setAwaiting] = useState(false);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [recharge, setRecharge] = useState<RechargeReason | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  /** Bubbles that already played (or should skip) their entrance animation. */
  const animatedKeys = useRef(new Set<string>()).current;
  /** What to do after a successful in-chat recharge. */
  const pendingAfterRecharge = useRef<{ kind: "send"; text: string } | { kind: "unlock"; id: number } | null>(null);
  const awaitingRef = useRef(false);

  const gradient = useMemo(
    () => personaGradient(personaId ?? "", persona?.accent ?? null),
    [personaId, persona?.accent],
  );
  const personaLite = useMemo(
    () => ({
      id: personaId ?? "",
      name: persona?.name ?? "",
      avatarUrl: persona?.avatarUrl ?? null,
      accent: persona?.accent ?? null,
    }),
    [personaId, persona?.name, persona?.avatarUrl, persona?.accent],
  );

  const showToast = useCallback((message: string, tone: "celebrate" | "error") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  // ───────── load ─────────
  const load = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const res = await api.messages(personaId);
      const local = res.messages.map(toLocal);
      local.forEach((m) => animatedKeys.add(m.key));
      setPersona(res.persona);
      setMessages(local);
      setLoadState("ready");
    } catch (err) {
      setLoadError(errorMessage(err));
      setLoadState("error");
    }
  }, [personaId, animatedKeys]);

  useEffect(() => {
    load();
  }, [load]);

  // ───────── send ─────────
  const send = useCallback(
    async (text: string, retryKey?: string) => {
      if (!text.trim() || awaitingRef.current) return;
      awaitingRef.current = true;
      setAwaiting(true);
      const key = retryKey ?? `tmp${Date.now()}`;
      const now = new Date().toISOString();
      if (retryKey) {
        setMessages((ms) => ms.map((m) => (m.key === retryKey ? { ...m, status: "pending", createdAt: now } : m)));
      } else {
        setMessages((ms) => [...ms, { id: -Date.now(), key, role: "user", text, createdAt: now, photo: null, status: "pending" }]);
        setDraft("");
      }

      try {
        const res = await api.send(personaId, text);
        setMessages((ms) => [
          ...ms.map((m) => (m.key === key ? { ...res.userMessage, key } : m)),
          toLocal(res.reply),
        ]);
        setWallet(res.wallet);
        if (res.streakBonus) {
          haptic.success();
          showToast(fmt(chatCopy.streakBonus, { n: res.streakBonus }), "celebrate");
        }
      } catch (err) {
        if (isOutOfCredits(err)) {
          // Keep the words: put them back in the composer and resend after a recharge.
          setMessages((ms) => ms.filter((m) => m.key !== key));
          setDraft(text);
          const w = walletFromError(err);
          if (w) setWallet(w);
          pendingAfterRecharge.current = { kind: "send", text };
          haptic.warning();
          setRecharge("out_of_credits");
        } else {
          setMessages((ms) => ms.map((m) => (m.key === key ? { ...m, status: "failed" } : m)));
          haptic.error();
          showToast(errorMessage(err), "error");
        }
      } finally {
        awaitingRef.current = false;
        setAwaiting(false);
      }
    },
    [personaId, setWallet, showToast],
  );

  const sendDraft = useCallback(() => send(draft.trim()), [send, draft]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const retry = useCallback(
    (key: string) => {
      const m = messagesRef.current.find((x) => x.key === key);
      if (m) send(m.text, key);
    },
    [send],
  );

  // ───────── photos ─────────
  const unlock = useCallback(
    async (id: number) => {
      setUnlockingId(id);
      try {
        const res = await api.unlockPhoto(personaId, id);
        setMessages((ms) => ms.map((m) => (m.id === id ? { ...res.message, key: m.key } : m)));
        setWallet(res.wallet);
        haptic.success();
      } catch (err) {
        if (isOutOfCredits(err)) {
          const w = walletFromError(err);
          if (w) setWallet(w);
          pendingAfterRecharge.current = { kind: "unlock", id };
          haptic.warning();
          setRecharge("photo");
        } else {
          showToast(errorMessage(err), "error");
        }
      } finally {
        setUnlockingId(null);
      }
    },
    [personaId, setWallet, showToast],
  );

  const onRecharged = useCallback(
    (w: WalletSummary) => {
      setWallet(w);
      setNudgeDismissed(false);
      const next = pendingAfterRecharge.current;
      pendingAfterRecharge.current = null;
      if (next?.kind === "send") {
        send(next.text);
      } else if (next?.kind === "unlock") {
        unlock(next.id);
      }
    },
    [setWallet, send, unlock],
  );

  const closeRecharge = useCallback(() => {
    setRecharge(null);
    pendingAfterRecharge.current = null;
  }, []);

  const clearChat = useCallback(async () => {
    try {
      await api.clearChat(personaId);
      setInfoOpen(false);
      animatedKeys.clear();
      await load();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  }, [personaId, load, animatedKeys, showToast]);

  // ───────── derived ─────────
  const rows = useMemo(() => buildRows(messages), [messages]);
  const userCount = useMemo(() => messages.reduce((n, m) => n + (m.role === "user" ? 1 : 0), 0), [messages]);
  const lastFromHer = messages.length > 0 && messages[messages.length - 1].role === "assistant";
  const photoCost = useMemo(() => {
    for (const m of messages) if (m.photo) return m.photo.cost;
    return DEFAULT_PHOTO_COST;
  }, [messages]);

  const showNudge = !nudgeDismissed && wallet.freeLeftToday === 0 && wallet.credits <= LOW_CREDITS && loadState === "ready";
  // Starters help a new chat get going; later they only return when she spoke last (and the money nudge isn't showing).
  const showQuickReplies =
    !!persona &&
    persona.starters.length > 0 &&
    !awaiting &&
    (userCount <= 2 || (draft.length === 0 && lastFromHer && !showNudge));
  const costHint =
    wallet.freeLeftToday > 0 ? fmt(t.chat.freeLeft, { n: wallet.freeLeftToday }) : chatCopy.perMessage;

  const renderItem: ListRenderItem<ChatRow> = useCallback(
    ({ item }) =>
      item.kind === "day" ? (
        <DaySeparator label={item.label} />
      ) : (
        <MessageBubble
          message={item.message}
          first={item.first}
          last={item.last}
          persona={personaLite}
          gradient={gradient}
          animatedKeys={animatedKeys}
          unlocking={unlockingId === item.message.id}
          onRetry={retry}
          onUnlock={unlock}
          onOpenPhoto={setViewer}
        />
      ),
    [personaLite, gradient, animatedKeys, unlockingId, retry, unlock],
  );

  const openRechargeLow = useCallback(() => setRecharge("low_balance"), []);
  const openRechargeHeader = useCallback(
    () => setRecharge(wallet.credits <= LOW_CREDITS ? "low_balance" : "out_of_credits"),
    [wallet.credits],
  );

  const headerTitle = useCallback(
    () =>
      persona ? (
        <ChatHeaderTitle
          id={persona.id}
          name={persona.name}
          avatarUrl={persona.avatarUrl}
          accent={persona.accent}
          typing={awaiting}
          onPress={() => setInfoOpen(true)}
        />
      ) : null,
    [persona, awaiting],
  );
  const headerRight = useCallback(
    () => (
      <View style={styles.headerRight}>
        <CreditsPill onPress={openRechargeHeader} />
      </View>
    ),
    [openRechargeHeader],
  );

  const canGoBack = router.canGoBack();

  const typingRow = awaiting ? (
    <View style={styles.typingRow}>
      <Avatar id={personaLite.id} name={personaLite.name} uri={personaLite.avatarUrl} accent={personaLite.accent} size={28} />
      <TypingDots
        color={gradient.ring}
        style={{ backgroundColor: withAlpha(gradient.ring, 0.12), borderColor: withAlpha(gradient.ring, 0.3) }}
      />
    </View>
  ) : null;

  const intro = persona ? (
    <View style={styles.intro}>
      <Avatar id={persona.id} name={persona.name} uri={persona.avatarUrl} accent={persona.accent} size={76} ring online />
      <AppText variant="title2" align="center" style={styles.introName}>
        {persona.name}, {persona.age}
      </AppText>
      <AppText variant="caption" color="textSecondary" align="center" numberOfLines={2}>
        {persona.tagline}
      </AppText>
      {persona.tags.length ? (
        <View style={styles.introTags}>
          {persona.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[styles.introTag, { backgroundColor: gradient.tint }]}>
              <AppText variant="micro" color="textSecondary">
                {tag}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.introPill}>
        <AppText variant="micro" color="textMuted" align="center">
          {fmt(chatCopy.intro, { name: persona.name })} · {t.chat.aiTag}
        </AppText>
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: persona?.name ?? "",
          headerTitle,
          headerTitleAlign: "left",
          headerRight,
          // Deep-linked / refreshed chats have no history — still give a way back to the Chats list.
          headerLeft: canGoBack ? undefined : headerLeftHome,
          headerStyle: { backgroundColor: colors.bg },
        }}
      />
      <GlowBackground colors={[withAlpha(gradient.ring, 0.22), withAlpha(gradient.ring, 0)]} height={380} />
      <LinearGradient
        colors={[withAlpha(gradient.colors[0], 0), withAlpha(gradient.colors[0], 0.07)]}
        style={styles.bottomGlow}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        {loadState === "loading" ? (
          <ScreenState variant="loading" rows={4} />
        ) : loadState === "error" ? (
          <ScreenState variant="error" message={loadError ?? undefined} onRetry={load} />
        ) : (
          <FlatList
            inverted
            data={rows}
            keyExtractor={keyOf}
            renderItem={renderItem}
            ListHeaderComponent={typingRow}
            ListFooterComponent={intro}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            initialNumToRender={18}
            maxToRenderPerBatch={12}
            windowSize={11}
            removeClippedSubviews={Platform.OS === "android"}
          />
        )}

        {toast ? (
          <Toast key={toast.id} message={toast.message} tone={toast.tone} onHide={() => setToast(null)} />
        ) : null}

        {loadState === "ready" ? (
          <View style={styles.bottom}>
            {showNudge ? (
              <LowBalanceNudge credits={wallet.credits} onRecharge={openRechargeLow} onDismiss={() => setNudgeDismissed(true)} />
            ) : null}
            {showQuickReplies && persona ? (
              <QuickReplies starters={persona.starters} photoCost={photoCost} onPick={send} />
            ) : null}
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={sendDraft}
              busy={awaiting}
              hint={costHint}
              hintTone={wallet.freeLeftToday > 0 ? "free" : "paid"}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <PhotoViewer url={viewer} onClose={() => setViewer(null)} />
      {persona ? (
        <PersonaSheet persona={persona} visible={infoOpen} onClose={() => setInfoOpen(false)} onClear={clearChat} />
      ) : null}
      <RechargeSheet
        visible={recharge !== null}
        onClose={closeRecharge}
        onRecharged={onRecharged}
        reason={recharge ?? "out_of_credits"}
      />
    </SafeAreaView>
  );
}

const keyOf = (row: ChatRow) => row.key;

function headerLeftHome() {
  return (
    <Pressable
      onPress={() => router.replace("/")}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={chatCopy.back}
      style={styles.back}
    >
      <Ionicons name="chevron-back" size={26} color={colors.text} />
    </Pressable>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <View style={styles.dayWrap} accessibilityRole="header">
      <View style={styles.dayPill}>
        <AppText variant="micro" color="textSecondary">
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: Platform.OS === "web" ? space.sm : -space.sm },
  headerRight: { paddingRight: Platform.OS === "web" ? space.lg : 0 },
  bottomGlow: { position: "absolute", left: 0, right: 0, bottom: 0, height: 260 },
  list: { paddingTop: space.md, paddingBottom: space.sm },
  bottom: { paddingTop: space.xs },
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    paddingHorizontal: space.md,
    marginTop: space.md,
  },
  intro: { alignItems: "center", paddingHorizontal: space.xxxl, paddingTop: space.xl, paddingBottom: space.md, gap: space.xs },
  introName: { marginTop: space.sm },
  introTags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.xs + 2, marginTop: space.sm },
  introTag: { paddingHorizontal: space.sm + 2, paddingVertical: 3, borderRadius: radii.pill },
  introPill: {
    marginTop: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: withAlpha("#FFFFFF", 0.04),
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayWrap: { alignItems: "center", marginTop: space.lg, marginBottom: space.xs },
  dayPill: {
    paddingHorizontal: space.md,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
