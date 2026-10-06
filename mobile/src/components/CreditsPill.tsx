import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useAuth } from "../lib/auth";
import { fmt, t } from "../lib/strings";
import { colors, radii, space } from "../lib/theme";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";

/** At or below this many credits the pill (and the Recharge tab badge) turn into a warning. */
export const LOW_CREDITS = 5;

export type CreditsPillProps = {
  /** Defaults to the signed-in user's balance from `useAuth()`. */
  credits?: number;
  /** Usually `() => router.navigate("/wallet")`. Without it the pill is not pressable. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** 💎 balance pill (marigold). Turns red with a gentle pulse when credits ≤ LOW_CREDITS. */
export function CreditsPill({ credits, onPress, style }: CreditsPillProps) {
  const auth = useAuth();
  const n = credits ?? auth.credits;
  const low = n <= LOW_CREDITS;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!low) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [low, pulse]);

  const fg = low ? colors.danger : colors.accentText;
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      haptics
      hitSlop={8}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={fmt(t.common.credits, { n })}
      style={style}
    >
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor: low ? colors.dangerSoft : colors.accentSoft, borderColor: low ? colors.danger : colors.accentBorder },
          { transform: [{ scale: pulse }] },
        ]}
      >
        <MaterialCommunityIcons name="diamond-stone" size={16} color={fg} />
        <AppText variant="number" style={{ color: fg }}>
          {n}
        </AppText>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
