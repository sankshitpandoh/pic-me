import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PersonaSummary } from "../../lib/api";
import { colors, fonts, personaGradient, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { PressableScale } from "../PressableScale";

type Props = {
  persona: PersonaSummary;
  width: number;
  onPress: (p: PersonaSummary) => void;
};

const SCRIM = ["rgba(15,10,18,0)", "rgba(15,10,18,0.55)", "rgba(15,10,18,0.94)"] as const;
const TOP_SCRIM = ["rgba(15,10,18,0.35)", "rgba(15,10,18,0)"] as const;

/** Tall 3:4 Discover card: photo or persona gradient with decorative initial + hearts, scrim with name/city/vibe. */
export const PersonaCard = memo(function PersonaCard({ persona: p, width, onPress }: Props) {
  const g = personaGradient(p.id, p.accent);
  const handle = useCallback(() => onPress(p), [onPress, p]);
  const height = Math.round((width * 4) / 3);
  const tags = p.tags.slice(0, 1);

  return (
    <PressableScale
      onPress={handle}
      haptics
      scaleTo={0.96}
      style={[styles.card, { width, height }]}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${p.age}, ${p.city}. ${p.vibe}`}
    >
      {p.avatarUrl ? (
        <Image source={{ uri: p.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
      ) : (
        <LinearGradient colors={g.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
          <Ionicons name="heart" size={width * 0.34} color="rgba(255,255,255,0.10)" style={[styles.heartA, { transform: [{ rotate: "18deg" }] }]} />
          <Ionicons name="heart" size={width * 0.16} color="rgba(255,255,255,0.14)" style={[styles.heartB, { transform: [{ rotate: "-20deg" }] }]} />
          <Ionicons name="sparkles" size={width * 0.12} color="rgba(255,255,255,0.22)" style={styles.spark} />
          <Text allowFontScaling={false} style={[styles.initial, { fontSize: width * 0.95, lineHeight: width * 1.05, top: height * 0.06 }]}>
            {p.name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
      )}

      <LinearGradient colors={TOP_SCRIM} style={styles.topScrim} pointerEvents="none" />
      <View style={styles.top}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <AppText variant="micro" color="text" numberOfLines={1}>
              {tag}
            </AppText>
          </View>
        ))}
        {p.online ? (
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
          </View>
        ) : null}
      </View>

      <LinearGradient colors={SCRIM} locations={[0, 0.35, 1]} style={styles.scrim} pointerEvents="none" />
      <View style={styles.info}>
        <AppText variant="title2" numberOfLines={1}>
          {p.name}, <AppText variant="title2" color="textSecondary">{p.age}</AppText>
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          📍 {p.city}
        </AppText>
        <AppText variant="caption" color="text" numberOfLines={2} style={styles.vibe}>
          “{p.vibe}”
        </AppText>
      </View>
      <View style={[styles.ringEdge, { borderColor: g.tint }]} pointerEvents="none" />
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, overflow: "hidden", backgroundColor: colors.elevated },
  heartA: { position: "absolute", right: -10, top: "34%" },
  heartB: { position: "absolute", left: 14, top: "20%" },
  spark: { position: "absolute", right: 18, top: 52 },
  initial: {
    position: "absolute",
    left: -6,
    fontFamily: fonts.displayHeavy,
    color: "rgba(255,255,255,0.16)",
    includeFontPadding: false,
  },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 64 },
  top: {
    position: "absolute",
    top: space.sm + 2,
    left: space.sm + 2,
    right: space.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.xs,
  },
  tag: {
    flexShrink: 1,
    height: 24,
    paddingHorizontal: space.sm,
    borderRadius: radii.pill,
    justifyContent: "center",
    backgroundColor: "rgba(15,10,18,0.45)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  onlinePill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,10,18,0.45)",
    marginLeft: "auto",
  },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "62%" },
  info: { position: "absolute", left: space.md, right: space.md, bottom: space.md, gap: 1 },
  vibe: { marginTop: space.xs, opacity: 0.92 },
  ringEdge: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: radii.lg, borderWidth: 1 },
});
