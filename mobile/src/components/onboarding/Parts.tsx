import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { haptic } from "../../lib/haptics";
import { fmt, t } from "../../lib/strings";
import { colors, gradients, motion, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { copy } from "./copy";

/** "Step 2/3" + progress pills, with an optional back chevron. */
export function StepIndicator({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <View style={styles.stepRow}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={copy.back}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      <AppText variant="overline" color="textMuted" style={styles.stepText}>
        {fmt(copy.step, { n: step, total })}
      </AppText>
      <View style={styles.pills} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: total }, (_, i) =>
          i + 1 === step ? (
            <LinearGradient key={i} {...gradients.primary} style={[styles.pill, styles.pillActive]} />
          ) : (
            <View key={i} style={[styles.pill, { backgroundColor: i + 1 < step ? colors.primary : colors.elevated2 }]} />
          ),
        )}
      </View>
    </View>
  );
}

/** Red inline error under a field. */
export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Ionicons name="alert-circle" size={16} color={colors.danger} style={styles.errorIcon} />
      <AppText variant="caption" color="danger" style={styles.flex}>
        {message}
      </AppText>
    </View>
  );
}

/** Checkbox row for the 18+/AI consent. */
export function ConsentRow({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={copy.consentA11y}
      style={({ pressed }) => [styles.consent, checked && styles.consentOn, pressed && { opacity: 0.85 }]}
    >
      {checked ? (
        <LinearGradient {...gradients.primary} style={styles.check}>
          <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
        </LinearGradient>
      ) : (
        <View style={[styles.check, styles.checkOff]} />
      )}
      <AppText variant="caption" color={checked ? "text" : "textSecondary"} style={styles.flex}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Fades + slides its children in on mount — give it `key={step}` to animate step changes. */
export function StepFade({ children }: { children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: motion.slow, useNativeDriver: true }).start();
  }, [v]);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  return <Animated.View style={{ opacity: v, transform: [{ translateX }] }}>{children}</Animated.View>;
}

/** "Dobara bhejo" link with a countdown until `availableAt`. */
export function ResendRow({ availableAt, onResend, busy }: { availableAt: number; onResend: () => void; busy: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, Math.ceil((availableAt - now) / 1000));

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [availableAt]);

  if (left > 0) {
    return (
      <View style={styles.resendRow}>
        <Ionicons name="time-outline" size={15} color={colors.textMuted} />
        <AppText variant="caption" color="textMuted">
          {fmt(t.login.resendIn, { s: left })}
        </AppText>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onResend}
      disabled={busy}
      hitSlop={10}
      accessibilityRole="button"
      style={({ pressed }) => [styles.resendRow, (pressed || busy) && { opacity: 0.6 }]}
    >
      <Ionicons name="refresh" size={15} color={colors.primary} />
      <AppText variant="bodyStrong" color="primary">
        {t.login.resend}
      </AppText>
    </Pressable>
  );
}

/** Small text link (≥44pt tall). */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
    >
      <AppText variant="bodyStrong" color="textSecondary" style={styles.underline}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stepRow: { flexDirection: "row", alignItems: "center", minHeight: 28 },
  back: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: space.sm,
  },
  stepText: { flex: 1 },
  pills: { flexDirection: "row", gap: space.xs + 1 },
  pill: { width: 8, height: 6, borderRadius: 3 },
  pillActive: { width: 22 },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: space.xs + 2, marginTop: space.sm + 2 },
  errorIcon: { marginTop: 1 },
  consent: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  consentOn: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  check: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  checkOff: { borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  resendRow: { flexDirection: "row", alignItems: "center", gap: space.xs + 2, minHeight: 44 },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.xs },
  underline: { textDecorationLine: "underline", textDecorationColor: colors.borderStrong },
});
