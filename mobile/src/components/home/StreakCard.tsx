import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { WalletSummary } from "../../lib/api";
import { fmt } from "../../lib/strings";
import { colors, gradients, palette, radii, space, withAlpha } from "../../lib/theme";
import { AppText } from "../AppText";
import { homeCopy } from "./copy";

const MAX_DOTS = 10;

/** Rewarding strip: flame + streak days, and today's free messages as filled pips. */
export const StreakCard = memo(function StreakCard({ wallet }: { wallet: WalletSummary }) {
  const { streak, freeLeftToday, freePerDay } = wallet;
  const flicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flicker, streak]);

  const total = Math.min(Math.max(freePerDay, 0), MAX_DOTS);
  const filled = Math.min(freeLeftToday, total);

  return (
    <LinearGradient
      colors={[withAlpha(palette.rose500, 0.2), withAlpha(palette.violet500, 0.1)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Animated.View style={{ transform: [{ scale: flicker }] }}>
        <LinearGradient colors={["#FFB347", palette.rose500]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.flame}>
          <MaterialCommunityIcons name="fire" size={26} color={colors.textOnPrimary} />
        </LinearGradient>
      </Animated.View>
      <View style={styles.body}>
        <AppText variant="title3">
          {streak > 0 ? `🔥 ${fmt(homeCopy.streak, { n: streak })}` : homeCopy.streakStart}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {freeLeftToday > 0 ? fmt(homeCopy.freeLeft, { n: freeLeftToday }) : homeCopy.freeNone}
        </AppText>
        {total > 0 ? (
          <View style={styles.pips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: total }, (_, i) =>
              i < filled ? (
                <LinearGradient key={i} {...gradients.primary} style={styles.pip} />
              ) : (
                <View key={i} style={[styles.pip, styles.pipEmpty]} />
              ),
            )}
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md + 2,
    marginHorizontal: space.gutter,
    padding: space.md + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  flame: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  pips: { flexDirection: "row", gap: 4, marginTop: space.xs + 2 },
  pip: { flex: 1, maxWidth: 28, height: 5, borderRadius: 3 },
  pipEmpty: { backgroundColor: colors.borderStrong },
});
