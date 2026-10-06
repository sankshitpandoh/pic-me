import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { Pack } from "../../lib/api";
import { fmt, t } from "../../lib/strings";
import { colors, gradients, radii, shadows, space, withAlpha } from "../../lib/theme";
import { AppText } from "../AppText";
import { PressableScale } from "../PressableScale";
import { copy } from "./copy";

export type OfferCardProps = {
  offer: Pack;
  normalPrice: number | null;
  buying: boolean;
  disabled: boolean;
  onBuy: (packId: string) => void;
  compact?: boolean;
};

/** The first-recharge offer: marigold gradient border + glow, slow shimmer sweep and a gentle breathing pulse. */
export const OfferCard = memo(function OfferCard({ offer, normalPrice, buying, disabled, onBuy, compact = false }: OfferCardProps) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const s = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    s.start();
    p.start();
    return () => {
      s.stop();
      p.stop();
    };
  }, [shimmer, pulse]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-140, Math.max(width, 300) + 40] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const ag = gradients.accent;
  return (
    <Animated.View style={[styles.outer, shadows.glowAccent, { transform: [{ scale }] }]}>
      <Animated.View pointerEvents="none" style={[styles.halo, { opacity: glowOpacity }]} />
      <PressableScale
        onPress={() => onBuy(offer.id)}
        disabled={disabled}
        haptics
        accessibilityRole="button"
        accessibilityLabel={`${t.wallet.offer}: ₹${offer.priceInr} mein ${offer.credits} 💎`}
        accessibilityState={{ busy: buying, disabled }}
      >
        <LinearGradient colors={ag.colors} start={ag.start} end={ag.end} style={styles.border}>
          <View style={[styles.inner, compact && styles.innerCompact]} onLayout={onLayout}>
            <LinearGradient
              colors={[withAlpha(colors.accent, 0.22), withAlpha(colors.accent, 0.04)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX }, { rotate: "18deg" }] }]}>
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,236,200,0.18)", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <View style={styles.topRow}>
              <View style={styles.tag}>
                <AppText variant="micro" color="textOnAccent">
                  {t.wallet.offer}
                </AppText>
              </View>
              {!compact ? (
                <AppText variant="micro" color="accentText">
                  {copy.offerSub}
                </AppText>
              ) : null}
            </View>

            <View style={styles.mainRow}>
              <View style={{ flex: 1 }}>
                <AppText variant={compact ? "title1" : "display"} color="text">
                  {fmt(copy.offerTitle, { price: offer.priceInr, credits: offer.credits })}
                </AppText>
                <View style={styles.subRow}>
                  <AppText variant="bodyStrong" color="accentText">
                    {fmt(t.wallet.approx, { n: offer.approxMessages })}
                  </AppText>
                  {normalPrice ? (
                    <AppText variant="body" color="textMuted" style={styles.strike}>
                      {fmt(copy.normally, { n: normalPrice })}
                    </AppText>
                  ) : null}
                  {normalPrice ? (
                    <View style={styles.offPill}>
                      <AppText variant="micro" color="success">
                        {Math.round((1 - offer.priceInr / normalPrice) * 100)}% OFF
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <LinearGradient colors={ag.colors} start={ag.start} end={ag.end} style={[styles.cta, compact && styles.ctaCompact]}>
              {buying ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <AppText variant="button" color="textOnAccent">
                  {fmt(copy.offerCta, { price: offer.priceInr })} →
                </AppText>
              )}
            </LinearGradient>
          </View>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  outer: { borderRadius: radii.xl },
  halo: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: radii.xl + 6,
    borderWidth: 6,
    borderColor: withAlpha(colors.accent, 0.12),
  },
  border: { borderRadius: radii.xl, padding: 1.5 },
  inner: {
    borderRadius: radii.xl - 1.5,
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.md,
    overflow: "hidden",
  },
  innerCompact: { padding: space.md, gap: space.sm },
  shimmer: { position: "absolute", top: -60, bottom: -60, width: 90 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  tag: {
    height: 24,
    paddingHorizontal: space.sm + 2,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
  mainRow: { flexDirection: "row", alignItems: "center" },
  subRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 2, flexWrap: "wrap" },
  strike: { textDecorationLine: "line-through" },
  offPill: {
    height: 20,
    paddingHorizontal: space.sm,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: colors.successSoft,
  },
  cta: { height: 50, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  ctaCompact: { height: 46 },
});
