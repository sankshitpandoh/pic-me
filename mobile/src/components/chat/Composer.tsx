import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from "react-native";
import { haptic } from "../../lib/haptics";
import { t } from "../../lib/strings";
import { colors, fonts, gradients, radii, shadows, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { chatCopy } from "./copy";

export type ComposerProps = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  /** Blocks sending (e.g. while waiting for her reply). Typing stays enabled. */
  busy: boolean;
  /** Tiny cost line above the input. */
  hint: string;
  hintTone: "free" | "paid";
};

const LINE = 22;
const MAX_LINES = 5;

/** Elevated pill input + gradient send button with a cost hint above. */
export function Composer({ value, onChange, onSend, busy, hint, hintTone }: ComposerProps) {
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState(LINE);
  const canSend = value.trim().length > 0 && !busy;
  const scale = useRef(new Animated.Value(canSend ? 1 : 0.88)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: canSend ? 1 : 0.88, friction: 5, tension: 160, useNativeDriver: true }).start();
  }, [canSend, scale]);

  const send = () => {
    if (!canSend) return;
    haptic.impact();
    onSend();
  };

  // Web: Enter sends, Shift+Enter adds a new line.
  const onKeyPress =
    Platform.OS === "web"
      ? (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
          const ne = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean };
          if (ne.key === "Enter" && !ne.shiftKey) {
            e.preventDefault();
            send();
          }
        }
      : undefined;

  return (
    <View style={styles.wrap}>
      <View style={styles.hintRow}>
        {hintTone === "free" ? <Ionicons name="gift-outline" size={11} color={colors.success} /> : null}
        <AppText variant="micro" color={hintTone === "free" ? "success" : "textMuted"}>
          {hint}
        </AppText>
      </View>
      <View style={styles.bar}>
        <View style={[styles.inputPill, focused && styles.inputFocused]}>
          <TextInput
            style={[
              styles.input,
              { height: Math.min(Math.max(height, LINE), LINE * MAX_LINES) },
              Platform.OS === "web" ? ({ outlineStyle: "none", resize: "none" } as object) : null,
            ]}
            onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height)}
            scrollEnabled={height > LINE * MAX_LINES}
            value={value}
            onChangeText={onChange}
            placeholder={t.chat.placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyPress={onKeyPress}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            accessibilityLabel={t.chat.placeholder}
          />
        </View>
        <Animated.View style={[{ transform: [{ scale }] }, canSend && shadows.glowPrimary, styles.sendShell]}>
          <Pressable
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel={chatCopy.send}
            accessibilityState={{ disabled: !canSend }}
            hitSlop={4}
          >
            {canSend ? (
              <LinearGradient {...gradients.primary} style={styles.send}>
                <Ionicons name="arrow-up" size={22} color={colors.textOnPrimary} />
              </LinearGradient>
            ) : (
              <View style={[styles.send, styles.sendOff]}>
                <Ionicons name="arrow-up" size={22} color={colors.textDisabled} />
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: space.sm },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: space.md, marginBottom: space.xs + 2 },
  bar: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  inputPill: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    backgroundColor: colors.elevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
  },
  inputFocused: { borderColor: colors.primaryBorder },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: LINE,
    color: colors.text,
    marginVertical: 13,
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: "top",
  },
  sendShell: { borderRadius: 22, marginBottom: 2 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  sendOff: { backgroundColor: colors.elevated2 },
});
