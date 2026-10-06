import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "../AppText";
import { colors, gradients, radii, space } from "../../lib/theme";

type Props = { price: number; loading?: boolean; variant?: "primary" | "accent"; size?: "md" | "sm" };

/** Non-interactive gradient price pill (the whole card is the button). */
export function PricePill({ price, loading = false, variant = "primary", size = "md" }: Props) {
  const g = variant === "accent" ? gradients.accent : gradients.primary;
  const h = size === "md" ? 44 : 38;
  return (
    <LinearGradient colors={g.colors} start={g.start} end={g.end} style={[styles.pill, { height: h, minWidth: size === "md" ? 76 : 68 }]}>
      {loading ? (
        <ActivityIndicator color={variant === "accent" ? colors.textOnAccent : colors.textOnPrimary} size="small" />
      ) : (
        <View style={styles.row}>
          <AppText variant="title3" color={variant === "accent" ? "textOnAccent" : "textOnPrimary"}>
            ₹{price}
          </AppText>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: radii.pill, paddingHorizontal: space.lg, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center" },
});
