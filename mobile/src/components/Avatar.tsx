import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts, palette, personaGradient } from "../lib/theme";

export type AvatarProps = {
  /** Persona id — picks the gradient identity when `accent` is not given. */
  id: string;
  name: string;
  /** Photo URL. Without it a gradient circle with her initial is shown. */
  uri?: string | null;
  /** Diameter of the face itself, in px. Default 48. The ring (if any) adds 8px. */
  size?: number;
  /** Persona `accent` from the API (two hex colors). */
  accent?: [string, string] | null;
  /** Draw a 2px gradient ring + 2px gap around the face (total size + 8). */
  ring?: boolean;
  /** Show the mint online dot. */
  online?: boolean;
  /** Color of the ring gap + online-dot border — set it to the background the avatar sits on. Default `colors.bg`. */
  gapColor?: string;
  style?: StyleProp<ViewStyle>;
};

/** Persona avatar: photo (expo-image, memory-disk cache) or gradient initial, optional gradient ring and online dot. */
export function Avatar({ id, name, uri, size = 48, accent, ring = false, online = false, gapColor = colors.bg, style }: AvatarProps) {
  const g = personaGradient(id, accent);
  const outer = ring ? size + 8 : size;
  const circle = (d: number) => ({ width: d, height: d, borderRadius: d / 2 });
  const dot = Math.max(10, Math.round(size * 0.26));

  const face = uri ? (
    <Image
      source={{ uri }}
      style={[circle(size), { backgroundColor: colors.elevated }]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <LinearGradient colors={g.colors} start={g.start} end={g.end} style={[circle(size), styles.center, styles.clip]}>
      <Ionicons
        name="heart"
        size={size * 0.95}
        color="rgba(255,255,255,0.12)"
        style={[styles.heart, { transform: [{ rotate: "-14deg" }] }]}
      />
      <Text
        allowFontScaling={false}
        style={[styles.initial, { fontSize: size * 0.44, lineHeight: size * 0.56 }]}
      >
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );

  return (
    <View style={[circle(outer), styles.center, style]} accessibilityRole="image" accessibilityLabel={name}>
      {ring ? (
        <LinearGradient colors={g.colors} start={g.start} end={g.end} style={[circle(outer), styles.center]}>
          <View style={[circle(size + 4), styles.center, { backgroundColor: gapColor }]}>{face}</View>
        </LinearGradient>
      ) : (
        face
      )}
      {online ? (
        <View
          style={[
            styles.dot,
            circle(dot),
            { borderColor: gapColor, right: ring ? 2 : 0, bottom: ring ? 2 : 0 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", overflow: "visible" },
  clip: { overflow: "hidden" },
  heart: { position: "absolute" },
  initial: { fontFamily: fonts.displayHeavy, color: "#FFFFFF", includeFontPadding: false, textAlign: "center" },
  dot: { position: "absolute", backgroundColor: palette.mint500, borderWidth: 2 },
});
