import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, gradients, radii, space } from "../lib/theme";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";

export type GradientButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner and blocks presses. */
  loading?: boolean;
  /** "primary" = rose→violet (default). "accent" = marigold — ONLY for money/credits actions. */
  variant?: "primary" | "accent";
  /** Heights: lg 54 (default), md 46, sm 36. */
  size?: "lg" | "md" | "sm";
  /** Optional leading element, e.g. `<Ionicons name="send" size={18} color="#fff" />`. */
  icon?: ReactNode;
  /** Outer container style (width, margins, alignSelf…). Stretches to its parent's width by default. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const HEIGHT = { lg: 54, md: 46, sm: 36 } as const;
const PAD_X = { lg: space.xxl, md: space.xl, sm: space.lg } as const;

/** Pill-shaped gradient CTA with press-scale + selection haptic. Disabled renders solid `elevated2`, never faded pink. */
export function GradientButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "lg",
  icon,
  style,
  accessibilityLabel,
}: GradientButtonProps) {
  const inactive = disabled || loading;
  const textColor = disabled ? "textDisabled" : variant === "accent" ? "textOnAccent" : "textOnPrimary";
  const g = variant === "accent" ? gradients.accent : gradients.primary;
  const inner = { height: HEIGHT[size], paddingHorizontal: PAD_X[size] };

  const content = loading ? (
    <ActivityIndicator color={colors[textColor]} />
  ) : (
    <View style={styles.row}>
      {icon}
      <AppText variant={size === "sm" ? "caption" : "button"} color={textColor} numberOfLines={1}>
        {title}
      </AppText>
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      haptics
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.outer, style]}
    >
      {disabled ? (
        <View style={[styles.fill, inner, styles.disabled]}>{content}</View>
      ) : (
        <LinearGradient colors={g.colors} start={g.start} end={g.end} style={[styles.fill, inner]}>
          {content}
        </LinearGradient>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: radii.pill, overflow: "hidden" },
  fill: { alignItems: "center", justifyContent: "center", borderRadius: radii.pill },
  disabled: { backgroundColor: colors.elevated2 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
