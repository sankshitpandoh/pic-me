import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { fmt, t } from "../../lib/strings";
import { colors, gradients, radii, shadows, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { copy } from "./copy";

const PARTICLES = ["💎", "✨", "🎉", "💎", "⭐", "💖", "💎", "✨", "🎊", "💎", "⭐", "✨"] as const;
// Precomputed burst vectors (angle spread around the circle, varied distance) — no per-render work.
const VECTORS = PARTICLES.map((_, i) => {
  const angle = (i / PARTICLES.length) * Math.PI * 2 - Math.PI / 2 + (i % 2 ? 0.18 : -0.12);
  const dist = 110 + (i % 3) * 32;
  // Squash the lower half so particles mostly fly up and sideways, clear of the copy below the badge.
  const y = Math.sin(angle) * dist;
  return { x: Math.cos(angle) * dist * 1.15, y: y > 0 ? y * 0.45 : y, rot: (i % 2 ? 1 : -1) * (40 + i * 9), size: 20 + (i % 3) * 6 };
});

export type CelebrationProps = {
  /** Credits just added; null hides the overlay. */
  credits: number | null;
  onDone: () => void;
  /** Auto-dismiss delay in ms. Default 2000. */
  duration?: number;
  /** Extra style for the overlay root (e.g. negative insets to cover a padded parent). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-area success overlay (works on web — no Alert): a springy check badge, the success copy,
 * and a one-shot burst of emoji / gem particles. Native-driver only; auto-dismisses.
 */
export function Celebration({ credits, onDone, duration = 2000, style }: CelebrationProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (credits == null) return;
    fade.setValue(0);
    pop.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => doneRef.current());
    }, duration);
    return () => clearTimeout(timer);
  }, [credits, duration, fade, pop, burst]);

  if (credits == null) return null;

  const badgeScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const textY = pop.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, style, { opacity: fade }]} accessibilityLiveRegion="polite">
      <Pressable style={StyleSheet.absoluteFill} onPress={() => doneRef.current()} accessibilityRole="button" accessibilityLabel={t.common.close} />
      <View style={styles.center} pointerEvents="none">
        <View style={styles.burst}>
          {VECTORS.map((v, i) => {
            const tx = burst.interpolate({ inputRange: [0, 1], outputRange: [0, v.x] });
            const ty = burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, v.y, v.y + 40] });
            const op = burst.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 1, 0] });
            const rot = burst.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${v.rot}deg`] });
            const sc = burst.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.4, 1.15, 0.9] });
            return (
              <Animated.Text
                key={i}
                style={[styles.particle, { fontSize: v.size, opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot }, { scale: sc }] }]}
              >
                {PARTICLES[i]}
              </Animated.Text>
            );
          })}
          <Animated.View style={[styles.badgeWrap, shadows.glowPrimary, { transform: [{ scale: badgeScale }] }]}>
            <LinearGradient {...gradients.primary} style={styles.badge}>
              <Ionicons name="checkmark" size={56} color={colors.textOnPrimary} />
            </LinearGradient>
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, { opacity: pop, transform: [{ translateY: textY }] }]}>
          <AppText variant="title1" align="center">
            {fmt(t.wallet.success, { n: credits })}
          </AppText>
          <AppText variant="bodyLg" color="textSecondary" align="center">
            {copy.celebrateSub}
          </AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.overlay, zIndex: 50, elevation: 50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.xxxl },
  burst: { width: 112, height: 112, alignItems: "center", justifyContent: "center" },
  particle: { position: "absolute", textAlign: "center" },
  badgeWrap: { borderRadius: 56 },
  badge: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.18)" },
  copy: { marginTop: space.xxl, gap: space.xs, alignItems: "center", borderRadius: radii.lg },
});
