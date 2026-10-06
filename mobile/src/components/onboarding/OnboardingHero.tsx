import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { t } from "../../lib/strings";
import { colors, motion, palette, radii, space, type, withAlpha } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { copy } from "./copy";

/**
 * Soft radial glow without blur: a stack of concentric low-alpha circles.
 * Cheap (plain Views) and renders identically on Android, iOS and web.
 */
const Orb = memo(function Orb({ size, color, style }: { size: number; color: string; style?: StyleProp<ViewStyle> }) {
  const layers = 18;
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width: size, height: size }, style]}>
      {Array.from({ length: layers }, (_, i) => {
        const d = size * (1 - i / (layers + 1));
        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: (size - d) / 2,
              top: (size - d) / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: withAlpha(color, 0.028),
            }}
          />
        );
      })}
    </View>
  );
});

const TRIO = [
  { id: "ananya", name: "Ananya", size: 58 },
  { id: "priya", name: "Priya", size: 78 },
  { id: "meera", name: "Meera", size: 58 },
] as const;

export type OnboardingHeroProps = {
  /** Minimum height; the hero grows to fill whatever the form card leaves free. */
  height: number;
  topInset: number;
  /** Keyboard is up: hide the avatar trio and shrink the wordmark. */
  compact?: boolean;
};

export function OnboardingHero({ height, topInset, compact = false }: OnboardingHeroProps) {
  const enter = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: motion.hero, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, float]);

  const rise = enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const bob = float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const bubbleBob = float.interpolate({ inputRange: [0, 1], outputRange: [-2, 3] });

  return (
    <View style={[styles.hero, { minHeight: height, paddingTop: topInset }]}>
      <Orb size={340} color={palette.rose500} style={{ top: -150, left: -120 }} />
      <Orb size={300} color={palette.violet500} style={{ top: height * 0.18, right: -150 }} />
      <Orb size={320} color={palette.rose500} style={{ bottom: -210, left: "50%", marginLeft: -160 }} />

      <Animated.View style={[styles.content, { opacity: enter, transform: [{ translateY: rise }] }]}>
        {!compact ? (
          <Animated.View style={[styles.trioWrap, { transform: [{ translateY: bob }] }]}>
            <Animated.View style={[styles.bubble, { transform: [{ translateY: bubbleBob }] }]}>
              <AppText variant="caption" color="text" numberOfLines={1}>
                {copy.heroBubble}
              </AppText>
            </Animated.View>
            <View style={styles.trio}>
              {TRIO.map((p, i) => (
                <Avatar
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  size={p.size}
                  ring
                  online
                  gapColor={colors.bg}
                  style={[
                    i === 1 ? styles.center : styles.side,
                    i === 0 && { marginRight: -16 },
                    i === 2 && { marginLeft: -16 },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.wordmarkRow}>
          <AppText style={compact ? styles.wordmarkCompact : styles.wordmark} allowFontScaling={false}>
            {t.brand}
          </AppText>
          <Ionicons name="heart" size={compact ? 14 : 18} color={colors.primary} style={styles.heart} />
        </View>
        <AppText variant={compact ? "body" : "bodyLg"} color="textSecondary" align="center">
          {t.login.tagline}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexGrow: 1, overflow: "hidden", justifyContent: "center", paddingBottom: space.xxxl },
  content: { alignItems: "center", paddingHorizontal: space.gutter },
  trioWrap: { alignItems: "center", marginBottom: space.xl },
  trio: { flexDirection: "row", alignItems: "flex-end" },
  center: { zIndex: 2 },
  side: { marginBottom: 4, opacity: 0.95 },
  bubble: {
    alignSelf: "center",
    marginBottom: space.md,
    marginLeft: space.huge,
    paddingHorizontal: space.md,
    paddingVertical: space.sm - 1,
    backgroundColor: colors.elevated,
    borderColor: colors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.bubble,
    borderBottomLeftRadius: radii.bubbleTail,
  },
  wordmarkRow: { flexDirection: "row", alignItems: "flex-start" },
  wordmark: { ...type.hero, color: colors.text, letterSpacing: -0.5 },
  wordmarkCompact: { ...type.display, color: colors.text },
  heart: { marginLeft: 2, marginTop: 4 },
});
