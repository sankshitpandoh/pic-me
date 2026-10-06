import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { gradients, type Gradient } from "../lib/theme";

export type GlowBackgroundProps = {
  /** Gradient colors, top → bottom. Default `gradients.screenGlow` (soft rose). Pass e.g. `[persona.tint, "transparent"]`. */
  colors?: Gradient["colors"];
  /** Glow height in px. Default 320. */
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Absolute, non-interactive glow pinned to the top of a screen. Render it first inside the screen's root view. */
export function GlowBackground({ colors = gradients.screenGlow.colors, height = 320, style }: GlowBackgroundProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.glow, { height }, style]}
    />
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none" },
});
