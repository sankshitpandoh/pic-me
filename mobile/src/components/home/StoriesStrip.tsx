import { memo, useCallback } from "react";
import { FlatList, StyleSheet, View, type ListRenderItem } from "react-native";
import type { PersonaSummary } from "../../lib/api";
import { fmt } from "../../lib/strings";
import { colors, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { PressableScale } from "../PressableScale";
import { firstName, homeCopy } from "./copy";

type Props = {
  personas: PersonaSummary[];
  onPress: (id: string) => void;
};

const Story = memo(function Story({ p, onPress }: { p: PersonaSummary; onPress: (id: string) => void }) {
  const handle = useCallback(() => onPress(p.id), [onPress, p.id]);
  return (
    <PressableScale
      onPress={handle}
      haptics
      scaleTo={0.92}
      style={styles.story}
      accessibilityRole="button"
      accessibilityLabel={fmt(homeCopy.openChat, { name: p.name })}
    >
      <Avatar id={p.id} name={p.name} uri={p.avatarUrl} accent={p.accent} size={64} ring online={p.online} />
      {p.unread > 0 ? <View style={styles.newDot} /> : null}
      <AppText variant="caption" color={p.unread > 0 ? "text" : "textSecondary"} numberOfLines={1} style={styles.name}>
        {firstName(p.name)}
      </AppText>
    </PressableScale>
  );
});

/** Horizontal "stories" row of every persona — one tap into a chat. */
export function StoriesStrip({ personas, onPress }: Props) {
  const renderItem = useCallback<ListRenderItem<PersonaSummary>>(
    ({ item }) => <Story p={item} onPress={onPress} />,
    [onPress],
  );
  const online = personas.filter((p) => p.online).length;
  return (
    <View>
      <View style={styles.headRow}>
        <AppText variant="overline" color="textMuted">
          {homeCopy.stories}
        </AppText>
        {online > 0 ? (
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <AppText variant="micro" color="success">
              {fmt(homeCopy.storiesOnline, { n: online })}
            </AppText>
          </View>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={personas}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.gutter,
    marginBottom: space.sm,
  },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.online },
  list: { paddingHorizontal: space.gutter - space.xs, gap: space.xs },
  story: { width: 80, alignItems: "center", paddingVertical: space.xs },
  name: { marginTop: space.xs + 2, maxWidth: 76 },
  newDot: {
    position: "absolute",
    top: space.xs + 2,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
