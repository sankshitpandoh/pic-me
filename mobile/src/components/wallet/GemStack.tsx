import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radii } from "../../lib/theme";

type Props = { tier: 1 | 2 | 3; size?: number; highlight?: boolean };

/** Square marigold tile with 1–3 stacked gems — the visual "size" of a pack. */
export const GemStack = memo(function GemStack({ tier, size = 56, highlight = false }: Props) {
  const g = Math.round(size * 0.42);
  const small = Math.round(g * 0.72);
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: radii.md },
        highlight && { borderColor: colors.accentBorder },
      ]}
    >
      {tier === 1 ? (
        <MaterialCommunityIcons name="diamond-stone" size={g} color={colors.accent} />
      ) : tier === 2 ? (
        <View style={{ width: g * 1.35, height: g * 1.1 }}>
          <MaterialCommunityIcons name="diamond-stone" size={small} color={colors.accentText} style={[styles.abs, { left: 0, top: 0, opacity: 0.75 }]} />
          <MaterialCommunityIcons name="diamond-stone" size={g} color={colors.accent} style={[styles.abs, { right: 0, bottom: 0 }]} />
        </View>
      ) : (
        <View style={{ width: g * 1.6, height: g * 1.3 }}>
          <MaterialCommunityIcons name="diamond-stone" size={small} color={colors.accentText} style={[styles.abs, { left: 0, bottom: 0, opacity: 0.7 }]} />
          <MaterialCommunityIcons name="diamond-stone" size={small} color={colors.accentText} style={[styles.abs, { right: 0, bottom: 0, opacity: 0.7 }]} />
          <MaterialCommunityIcons name="diamond-stone" size={g} color={colors.accent} style={[styles.abs, { left: (g * 1.6 - g) / 2, top: 0 }]} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "transparent",
  },
  abs: { position: "absolute" },
});
