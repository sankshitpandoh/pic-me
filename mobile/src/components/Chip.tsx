import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, space, type ColorName } from "../lib/theme";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";

export type ChipProps = {
  label: string;
  /** Without onPress the chip is a static tag. */
  onPress?: () => void;
  /** Selected chips always use the primary (rose) style. */
  selected?: boolean;
  /** Unselected look: "default" neutral, "primary" rose tint, "accent" marigold tint (money only). */
  tone?: "default" | "primary" | "accent";
  /** Optional leading icon / emoji node. */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const TONES: Record<"default" | "primary" | "accent" | "selected", { bg: string; border: string; text: ColorName }> = {
  default: { bg: colors.elevated, border: colors.border, text: "textSecondary" },
  primary: { bg: colors.primarySoft, border: "transparent", text: "primary" },
  accent: { bg: colors.accentSoft, border: colors.accentBorder, text: "accentText" },
  selected: { bg: colors.primarySoft, border: colors.primaryBorder, text: "text" },
};

/** Pill chip (~34px tall) for tags, filters and quick replies. */
export function Chip({ label, onPress, selected = false, tone = "default", icon, style }: ChipProps) {
  const s = TONES[selected ? "selected" : tone];
  const body = (
    <View style={[styles.chip, { backgroundColor: s.bg, borderColor: s.border }]}>
      {icon}
      <AppText variant="caption" color={s.text} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <PressableScale
      onPress={onPress}
      haptics
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={style}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    height: 34,
    paddingHorizontal: space.md + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
