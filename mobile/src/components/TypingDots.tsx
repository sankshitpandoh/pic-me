import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, space } from "../lib/theme";

export type TypingDotsProps = {
  /** Dot color. Default `colors.textMuted`. */
  color?: string;
  /** Extra style for the bubble (e.g. margins). The bubble already aligns itself to the left. */
  style?: StyleProp<ViewStyle>;
};

const STAGGER = 140;
const BOUNCE = 260;

/** "She's typing" indicator: a their-side chat bubble with three bouncing dots. */
export function TypingDots({ color = colors.textMuted, style }: TypingDotsProps) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STAGGER),
          Animated.timing(v, { toValue: 1, duration: BOUNCE, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: BOUNCE, useNativeDriver: true }),
          Animated.delay((dots.length - 1 - i) * STAGGER + 200),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={[styles.bubble, style]} accessibilityRole="progressbar" accessibilityLabel="typing">
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: color },
            {
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
              transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 40,
    paddingHorizontal: space.lg,
    backgroundColor: colors.bubbleTheirs,
    borderColor: colors.bubbleTheirsBorder,
    borderWidth: 1,
    borderRadius: radii.bubble,
    borderBottomLeftRadius: radii.bubbleTail,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
