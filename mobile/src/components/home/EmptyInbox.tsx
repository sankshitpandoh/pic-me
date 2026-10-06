import { StyleSheet, View } from "react-native";
import type { PersonaSummary } from "../../lib/api";
import { colors, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { Avatar } from "../Avatar";
import { GradientButton } from "../GradientButton";
import { homeCopy } from "./copy";

type Props = { personas: PersonaSummary[]; onDiscover: () => void };

/** Friendly "no chats yet" card: a fanned trio of faces with a love letter, copy and a Discover CTA. */
export function EmptyInbox({ personas, onDiscover }: Props) {
  const trio = personas.slice(0, 3);
  return (
    <View style={styles.card}>
      <View style={styles.faces}>
        {trio.map((p, i) => (
          <View
            key={p.id}
            style={[
              styles.face,
              i === 1 ? styles.mid : { transform: [{ rotate: i === 0 ? "-10deg" : "10deg" }], marginTop: space.md },
            ]}
          >
            <Avatar id={p.id} name={p.name} uri={p.avatarUrl} accent={p.accent} size={i === 1 ? 64 : 52} ring gapColor={colors.surface} />
          </View>
        ))}
        <AppText style={styles.letter}>💌</AppText>
      </View>
      <AppText variant="title2" align="center">
        {homeCopy.emptyTitle}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {homeCopy.emptyMessage}
      </AppText>
      <GradientButton title={homeCopy.emptyCta} onPress={onDiscover} size="md" style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.gutter,
    marginTop: space.sm,
    padding: space.xl,
    paddingTop: space.xxl,
    gap: space.sm,
    alignItems: "center",
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  faces: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.md },
  face: { marginHorizontal: -space.sm },
  mid: { zIndex: 2 },
  letter: { position: "absolute", bottom: -14, alignSelf: "center", left: "50%", marginLeft: -16, fontSize: 28, lineHeight: 34, zIndex: 3 },
  cta: { marginTop: space.md, alignSelf: "center" },
});
