import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { fmt } from "../../lib/strings";
import { colors, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { Chip } from "../Chip";
import { PressableScale } from "../PressableScale";
import { chatCopy, isPhotoStarter } from "./copy";

export type QuickRepliesProps = {
  starters: string[];
  photoCost: number;
  onPick: (text: string) => void;
};

/** Horizontal starter chips above the composer. Tapping one sends it right away. */
function QuickRepliesBase({ starters, photoCost, onPick }: QuickRepliesProps) {
  if (starters.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {starters.map((s) =>
        isPhotoStarter(s) ? (
          <PressableScale
            key={s}
            onPress={() => onPick(s)}
            haptics
            accessibilityRole="button"
            accessibilityLabel={`${s}. ${fmt(chatCopy.photoHint, { cost: photoCost })}`}
          >
            <View style={styles.photoChip}>
              <Ionicons name="camera" size={14} color={colors.primary} />
              <AppText variant="caption" color="text" numberOfLines={1}>
                {s}
              </AppText>
              <View style={styles.cost}>
                <AppText variant="micro" color="accentText">
                  {fmt(chatCopy.photoHint, { cost: photoCost })}
                </AppText>
              </View>
            </View>
          </PressableScale>
        ) : (
          <Chip key={s} label={s} onPress={() => onPick(s)} />
        ),
      )}
    </ScrollView>
  );
}

export const QuickReplies = memo(QuickRepliesBase);

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs },
  photoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    height: 34,
    paddingLeft: space.md,
    paddingRight: space.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  cost: {
    height: 24,
    justifyContent: "center",
    paddingHorizontal: space.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
});
