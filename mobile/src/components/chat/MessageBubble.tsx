import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { PhotoInfo } from "../../lib/api";
import { colors, gradients, motion, radii, space, type PersonaGradient } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { chatCopy, formatTime } from "./copy";
import type { LocalMessage } from "./model";
import { PhotoMessage } from "./PhotoMessage";

export type MessageBubbleProps = {
  message: LocalMessage;
  first: boolean;
  last: boolean;
  persona: { id: string; name: string; avatarUrl: string | null; accent: [string, string] | null };
  gradient: PersonaGradient;
  /** Keys that already played their entrance animation (shared, mutable). */
  animatedKeys: Set<string>;
  unlocking: boolean;
  onRetry: (key: string) => void;
  onUnlock: (messageId: number) => void;
  onOpenPhoto: (url: string) => void;
};

const AVATAR = 28;

function MessageBubbleBase({
  message,
  first,
  last,
  persona,
  gradient,
  animatedKeys,
  unlocking,
  onRetry,
  onUnlock,
  onOpenPhoto,
}: MessageBubbleProps) {
  const mine = message.role === "user";
  const fresh = useRef(!animatedKeys.has(message.key)).current;
  const enter = useRef(new Animated.Value(fresh ? 0 : 1)).current;

  useEffect(() => {
    if (!fresh) return;
    animatedKeys.add(message.key);
    Animated.timing(enter, { toValue: 1, duration: motion.slow, useNativeDriver: true }).start();
  }, [fresh, enter, animatedKeys, message.key]);

  const shape = bubbleShape(mine, first, last);
  const failed = message.status === "failed";
  const hasText = message.text.trim().length > 0;

  const textBubble = hasText ? (
    mine ? (
      <LinearGradient
        colors={gradients.bubbleMine.colors}
        start={gradients.bubbleMine.start}
        end={gradients.bubbleMine.end}
        style={[styles.bubble, shape, failed && styles.failedBubble]}
      >
        <AppText variant="bodyLg" style={styles.mineText} selectable>
          {message.text}
        </AppText>
      </LinearGradient>
    ) : (
      <View style={[styles.bubble, styles.theirs, shape]}>
        <AppText variant="bodyLg" color="bubbleTheirsText" selectable>
          {message.text}
        </AppText>
      </View>
    )
  ) : null;

  return (
    <Animated.View
      style={[
        styles.row,
        mine ? styles.rowMine : styles.rowTheirs,
        { marginTop: first ? space.md - 2 : space.xxs },
        {
          opacity: enter,
          transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      {!mine ? (
        <View style={styles.avatarCol}>
          {last ? (
            <Avatar id={persona.id} name={persona.name} uri={persona.avatarUrl} accent={persona.accent} size={AVATAR} />
          ) : null}
        </View>
      ) : null}

      <View style={[styles.col, mine ? styles.colMine : styles.colTheirs]}>
        {textBubble}
        {message.photo ? (
          <PhotoView
            photo={message.photo}
            messageId={message.id}
            gradient={gradient}
            unlocking={unlocking}
            spaced={hasText}
            onUnlock={onUnlock}
            onOpenPhoto={onOpenPhoto}
          />
        ) : null}

        {failed ? (
          <Pressable
            onPress={() => onRetry(message.key)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={chatCopy.retry}
            style={styles.failedRow}
          >
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <AppText variant="micro" color="danger">
              {chatCopy.failed} ·{" "}
            </AppText>
            <AppText variant="micro" color="text" style={styles.retryLink}>
              {chatCopy.retry}
            </AppText>
          </Pressable>
        ) : last ? (
          <View style={[styles.meta, mine && styles.metaMine]}>
            <AppText variant="micro" color="textMuted">
              {formatTime(message.createdAt)}
            </AppText>
            {mine ? (
              message.status === "pending" ? (
                <Ionicons name="time-outline" size={12} color={colors.textMuted} accessibilityLabel="sending" />
              ) : (
                <Ionicons name="checkmark-done" size={14} color={colors.primary} accessibilityLabel="sent" />
              )
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Small wrapper so the photo props stay stable for the PhotoMessage memo. */
function PhotoView({
  photo,
  messageId,
  gradient,
  unlocking,
  spaced,
  onUnlock,
  onOpenPhoto,
}: {
  photo: PhotoInfo;
  messageId: number;
  gradient: PersonaGradient;
  unlocking: boolean;
  spaced: boolean;
  onUnlock: (messageId: number) => void;
  onOpenPhoto: (url: string) => void;
}) {
  return (
    <View style={spaced ? styles.photoGap : null}>
      <PhotoMessage
        photo={photo}
        gradient={gradient}
        unlocking={unlocking}
        onUnlock={() => onUnlock(messageId)}
        onOpen={onOpenPhoto}
      />
    </View>
  );
}

/** Messenger-style corners: the sender's side is tight (6) where bubbles of a group touch and on the tail. */
function bubbleShape(mine: boolean, first: boolean, last: boolean): ViewStyle {
  const R = radii.bubble;
  const r = radii.bubbleTail;
  const top = first ? R : r;
  const bottom = last ? r : r;
  return mine
    ? { borderTopRightRadius: top, borderBottomRightRadius: bottom, borderTopLeftRadius: R, borderBottomLeftRadius: R }
    : { borderTopLeftRadius: top, borderBottomLeftRadius: bottom, borderTopRightRadius: R, borderBottomRightRadius: R };
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: space.md },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  avatarCol: { width: AVATAR, marginRight: space.sm, marginBottom: 18 },
  col: { maxWidth: "78%" },
  colMine: { alignItems: "flex-end" },
  colTheirs: { alignItems: "flex-start" },
  bubble: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, overflow: "hidden" },
  theirs: { backgroundColor: colors.bubbleTheirs, borderWidth: 1, borderColor: colors.bubbleTheirsBorder },
  mineText: { color: colors.bubbleMineText },
  failedBubble: { opacity: 0.6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, paddingHorizontal: space.xs },
  metaMine: { justifyContent: "flex-end" },
  failedRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4, paddingVertical: 2 },
  retryLink: { textDecorationLine: "underline" },
  photoGap: { marginTop: space.xxs + 2 },
});
