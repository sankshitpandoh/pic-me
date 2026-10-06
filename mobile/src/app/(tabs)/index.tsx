import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from "react-native";
import { AppText } from "../../components/AppText";
import { GlowBackground } from "../../components/GlowBackground";
import { ScreenState } from "../../components/ScreenState";
import { ChatRow } from "../../components/home/ChatRow";
import { EmptyInbox } from "../../components/home/EmptyInbox";
import { dayPart, HOME_GLOW, homeCopy } from "../../components/home/copy";
import { StoriesStrip } from "../../components/home/StoriesStrip";
import { StreakCard } from "../../components/home/StreakCard";
import { usePersonas } from "../../components/home/usePersonas";
import type { PersonaSummary } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { colors, space } from "../../lib/theme";

function openChat(personaId: string) {
  router.push({ pathname: "/chat/[personaId]", params: { personaId } });
}

export default function ChatsScreen() {
  const { wallet } = useAuth();
  const { personas, error, refreshing, refresh, retry } = usePersonas();

  // Most recent conversation first (WhatsApp order).
  const conversations = useMemo(
    () =>
      (personas ?? [])
        .filter((p) => p.lastMessage)
        .sort((a, b) => Date.parse(b.lastMessage!.createdAt) - Date.parse(a.lastMessage!.createdAt)),
    [personas],
  );
  const part = dayPart();

  const renderItem = useCallback<ListRenderItem<PersonaSummary>>(
    ({ item }) => <ChatRow persona={item} onPress={openChat} />,
    [],
  );

  if (!personas) {
    return (
      <View style={styles.root}>
        <GlowBackground colors={HOME_GLOW} height={260} />
        {error ? <ScreenState variant="error" message={error} onRetry={retry} /> : <ScreenState variant="loading" rows={7} />}
      </View>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.greeting}>
        <AppText variant="title2">{homeCopy.greeting[part]}</AppText>
        <AppText variant="caption" color="textMuted">
          {homeCopy.greetingSub[part]}
        </AppText>
      </View>
      <StreakCard wallet={wallet} />
      <StoriesStrip personas={personas} onPress={openChat} />
      {conversations.length > 0 ? (
        <AppText variant="overline" color="textMuted" style={styles.section}>
          {homeCopy.conversations}
        </AppText>
      ) : (
        <EmptyInbox personas={personas} onDiscover={goDiscover} />
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <GlowBackground colors={HOME_GLOW} height={260} />
      <FlatList
        data={conversations}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.elevated} />
        }
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

function goDiscover() {
  router.navigate("/discover");
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: space.xxxl, flexGrow: 1 },
  header: { gap: space.xl, paddingTop: space.xs, paddingBottom: space.xs },
  greeting: { paddingHorizontal: space.gutter, gap: 2 },
  section: { paddingHorizontal: space.gutter, marginBottom: -space.sm },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: space.gutter - space.xs + 60 + space.md },
});
