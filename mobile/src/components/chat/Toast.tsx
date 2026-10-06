import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { colors, gradients, motion, radii, shadows, space } from "../../lib/theme";
import { AppText } from "../AppText";

/** Floating pill at the top of the chat ("🔥 Streak bonus +5 💎!"). Fades/slides in, hides itself after `duration`. */
export function Toast({ message, tone, onHide, duration = 3000 }: { message: string; tone: "celebrate" | "error"; onHide: () => void; duration?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const hideRef = useRef(onHide);
  hideRef.current = onHide;

  useEffect(() => {
    v.setValue(0);
    const anim = Animated.sequence([
      Animated.spring(v, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(v, { toValue: 0, duration: motion.base, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && hideRef.current());
    return () => anim.stop();
  }, [message, duration, v]);

  const style = {
    opacity: v,
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
    ],
  };

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert">
      {tone === "celebrate" ? (
        <LinearGradient {...gradients.accent} style={[styles.pill, shadows.glowAccent]}>
          <AppText variant="bodyStrong" color="textOnAccent">
            {message}
          </AppText>
        </LinearGradient>
      ) : (
        <Animated.View style={[styles.pill, styles.error]}>
          <AppText variant="caption" color="danger" align="center">
            {message}
          </AppText>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", top: space.md, left: space.lg, right: space.lg, alignItems: "center", zIndex: 10 },
  pill: { paddingHorizontal: space.lg + 2, paddingVertical: space.sm + 2, borderRadius: radii.pill },
  error: { backgroundColor: colors.elevated2, borderWidth: 1, borderColor: colors.danger },
});
