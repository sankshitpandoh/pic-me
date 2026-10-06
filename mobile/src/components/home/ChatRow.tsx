import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { PersonaSummary } from "../../lib/api";
import { fmt } from "../../lib/strings";
import { colors, gradients, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { homeCopy, relativeTime } from "./copy";

type Props = {
  persona: PersonaSummary;
  onPress: (id: string) => void;
};

function preview(p: PersonaSummary): string {
  const m = p.lastMessage;
  if (!m) return p.vibe;
  const body = m.hasPhoto ? homeCopy.photo : m.text;
  return m.role === "user" ? homeCopy.you + body : body;
}

/** One WhatsApp-style conversation row. Memoized — re-renders only when its persona object changes. */
export const ChatRow = memo(function ChatRow({ persona: p, onPress }: Props) {
  const handle = useCallback(() => onPress(p.id), [onPress, p.id]);
  const unread = p.unread > 0;
  const time = p.lastMessage ? relativeTime(p.lastMessage.createdAt) : "";
  const mine = p.lastMessage?.role === "user";

  return (
    <Pressable
      onPress={handle}
      android_ripple={{ color: colors.elevated2 }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}. ${preview(p)}. ${time}${unread ? `. ${fmt(homeCopy.unreadA11y, { n: p.unread })}` : ""}`}
    >
      <Avatar id={p.id} name={p.name} uri={p.avatarUrl} accent={p.accent} size={52} ring online={p.online} />
      <View style={styles.body}>
        <View style={styles.line}>
          <View style={styles.nameRow}>
            <AppText variant="title3" numberOfLines={1} style={styles.shrink}>
              {p.name}
            </AppText>
            <View style={styles.aiTag}>
              <AppText variant="micro" color="textMuted" style={styles.aiText}>
                {homeCopy.aiTag}
              </AppText>
            </View>
          </View>
          <AppText variant="micro" color={unread ? "primary" : "textMuted"} style={styles.time}>
            {time}
          </AppText>
        </View>
        <View style={styles.line}>
          <View style={styles.previewRow}>
            {mine ? <Ionicons name="checkmark-done" size={16} color={colors.textMuted} /> : null}
            <AppText
              variant={unread ? "bodyStrong" : "body"}
              color={unread ? "text" : "textSecondary"}
              numberOfLines={1}
              style={styles.shrink}
            >
              {preview(p)}
            </AppText>
          </View>
          {unread ? (
            <LinearGradient {...gradients.primary} style={styles.badge}>
              <AppText variant="micro" color="textOnPrimary" style={styles.badgeText}>
                {p.unread > 99 ? "99+" : p.unread}
              </AppText>
            </LinearGradient>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.gutter - space.xs,
    paddingVertical: space.sm + 2,
    minHeight: 76,
  },
  pressed: { backgroundColor: colors.surface },
  body: {
    flex: 1,
    gap: space.xxs + 1,
    paddingVertical: space.xs,
  },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, flexShrink: 1 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: space.xs, flex: 1 },
  shrink: { flexShrink: 1 },
  aiTag: {
    paddingHorizontal: space.xs + 1,
    height: 16,
    justifyContent: "center",
    borderRadius: radii.xs - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  aiText: { fontSize: 9, lineHeight: 12, letterSpacing: 0.6 },
  time: { flexShrink: 0 },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, lineHeight: 14 },
});
