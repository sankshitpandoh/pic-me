import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { fmt, t } from "../../lib/strings";
import { colors, gradients, radii, space } from "../../lib/theme";
import { AppText } from "../AppText";
import { PressableScale } from "../PressableScale";
import { chatCopy } from "./copy";

/** Dismissible marigold strip shown when credits run low and today's free messages are used up. */
export function LowBalanceNudge({ credits, onRecharge, onDismiss }: { credits: number; onRecharge: () => void; onDismiss: () => void }) {
  const text = credits <= 0 ? t.chat.outOfCredits : fmt(t.chat.lowBalance, { n: credits });
  return (
    <View style={styles.strip} accessibilityRole="alert">
      <MaterialCommunityIcons name="diamond-stone" size={18} color={colors.accent} />
      <AppText variant="caption" color="accentText" style={styles.text} numberOfLines={2}>
        {text}
      </AppText>
      <PressableScale onPress={onRecharge} haptics accessibilityRole="button" accessibilityLabel={chatCopy.recharge}>
        <LinearGradient {...gradients.accent} style={styles.cta}>
          <AppText variant="caption" color="textOnAccent">
            {chatCopy.recharge}
          </AppText>
        </LinearGradient>
      </PressableScale>
      <Pressable onPress={onDismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel={chatCopy.dismiss} style={styles.close}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginHorizontal: space.md,
    marginBottom: space.xs,
    paddingLeft: space.md,
    paddingRight: space.xs,
    paddingVertical: space.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  text: { flex: 1 },
  cta: { height: 32, paddingHorizontal: space.md, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  close: { width: 28, height: 32, alignItems: "center", justifyContent: "center" },
});
