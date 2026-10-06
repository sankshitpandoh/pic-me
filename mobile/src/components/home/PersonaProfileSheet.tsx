import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, View } from "react-native";
import type { PersonaSummary } from "../../lib/api";
import { fmt } from "../../lib/strings";
import { colors, personaGradient, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { BottomSheet } from "../BottomSheet";
import { Chip } from "../Chip";
import { GradientButton } from "../GradientButton";
import { firstName, homeCopy } from "./copy";

type Props = {
  persona: PersonaSummary | null;
  visible: boolean;
  onClose: () => void;
  onChat: (id: string) => void;
};

/** Persona profile preview sheet opened from a Discover card. */
export function PersonaProfileSheet({ persona: p, visible, onClose, onChat }: Props) {
  if (!p) return null;
  const g = personaGradient(p.id, p.accent);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <LinearGradient colors={[g.tint, "rgba(0,0,0,0)"]} style={styles.glow} pointerEvents="none" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.hero}>
          <Avatar id={p.id} name={p.name} uri={p.avatarUrl} accent={p.accent} size={96} ring online={p.online} gapColor={colors.surface} />
          <View style={styles.heroText}>
            <AppText variant="title1" numberOfLines={1}>
              {p.name}, <AppText variant="title1" color="textSecondary">{p.age}</AppText>
            </AppText>
            <AppText variant="caption" color="textSecondary">
              📍 {p.city}
              {p.online ? (
                <AppText variant="caption" color="success">
                  {"  ·  ● "}
                  {homeCopy.online}
                </AppText>
              ) : null}
            </AppText>
            <View style={styles.aiTag}>
              <Ionicons name="sparkles" size={12} color={colors.primary} />
              <AppText variant="micro" color="primary">
                {homeCopy.aiCharacter}
              </AppText>
            </View>
          </View>
        </View>

        <AppText variant="bodyLg" color="textSecondary">
          {p.tagline}
        </AppText>

        <View style={styles.block}>
          <AppText variant="overline" color="textMuted">
            {homeCopy.interests}
          </AppText>
          <View style={styles.chips}>
            {p.tags.map((tag) => (
              <Chip key={tag} label={tag} />
            ))}
          </View>
        </View>

        <View style={styles.langRow}>
          <Ionicons name="language-outline" size={18} color={colors.textMuted} />
          <AppText variant="caption" color="textMuted">
            {homeCopy.languages}:
          </AppText>
          <AppText variant="caption" color="text" style={styles.flex} numberOfLines={2}>
            {p.languages.join(" · ")}
          </AppText>
        </View>

        <View style={styles.block}>
          <AppText variant="overline" color="textMuted">
            {homeCopy.sayHi}
          </AppText>
          <View style={styles.bubbleRow}>
            <Avatar id={p.id} name={p.name} uri={p.avatarUrl} accent={p.accent} size={28} />
            <View style={styles.bubble}>
              <AppText variant="body" color="bubbleTheirsText">
                {p.greeting}
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
      <GradientButton
        title={fmt(homeCopy.talkTo, { name: firstName(p.name) })}
        onPress={() => onChat(p.id)}
        style={styles.cta}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 180, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl },
  content: { gap: space.lg, paddingBottom: space.lg },
  hero: { flexDirection: "row", alignItems: "center", gap: space.lg },
  heroText: { flex: 1, gap: space.xs },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.xs,
    height: 24,
    paddingHorizontal: space.sm + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryBorder,
    marginTop: 2,
  },
  block: { gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  langRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  bubble: {
    flex: 1,
    backgroundColor: colors.bubbleTheirs,
    borderColor: colors.bubbleTheirsBorder,
    borderWidth: 1,
    borderRadius: radii.bubble,
    borderBottomLeftRadius: radii.bubbleTail,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 2,
  },
  cta: { marginTop: space.xs },
});
