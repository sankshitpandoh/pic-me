import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { fmt, t } from "../../lib/strings";
import { colors, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { chatCopy } from "./copy";

export type ChatHeaderTitleProps = {
  id: string;
  name: string;
  avatarUrl: string | null;
  accent: [string, string] | null;
  typing: boolean;
  onPress: () => void;
};

/** Header title: ringed avatar with online dot, name + AI tag, and a live "online" / "likh rahi hai…" status line. */
export function ChatHeaderTitle({ id, name, avatarUrl, accent, typing, onPress }: ChatHeaderTitleProps) {
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0.2);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [typing, fade]);

  return (
    <Pressable
      onPress={onPress}
      style={styles.root}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${typing ? fmt(t.chat.typing, { name }) : t.chat.online}`}
    >
      <Avatar id={id} name={name} uri={avatarUrl} accent={accent} size={36} ring online />
      <View style={styles.texts}>
        <View style={styles.nameRow}>
          <AppText variant="title3" numberOfLines={1} style={styles.name}>
            {name}
          </AppText>
          <View style={styles.aiTag}>
            <AppText variant="micro" color="textSecondary" style={styles.aiText}>
              {chatCopy.ai}
            </AppText>
          </View>
        </View>
        <Animated.View style={[styles.status, { opacity: fade }]}>
          {typing ? (
            <AppText variant="micro" color="primary" numberOfLines={1}>
              {fmt(t.chat.typing, { name })}
            </AppText>
          ) : (
            <>
              <View style={styles.dot} />
              <AppText variant="micro" color="online">
                {t.chat.online}
              </AppText>
            </>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: space.sm + 2, minHeight: 44, paddingRight: space.sm },
  texts: { flexShrink: 1, justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: space.xs + 2 },
  name: { flexShrink: 1 },
  aiTag: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.xs,
    paddingHorizontal: 5,
    height: 16,
    justifyContent: "center",
  },
  aiText: { fontSize: 9, lineHeight: 12, letterSpacing: 0.6 },
  status: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 1, height: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.online },
});
