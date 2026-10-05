import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../lib/theme";

/** Shows the persona's photo, or her initial on a colored circle when no avatar is uploaded yet. */
export function Avatar({ name, uri, size = 48 }: { name: string; uri: string | null; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={style} contentFit="cover" transition={150} />;
  return (
    <View style={[styles.fallback, style]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  initial: { color: "#fff", fontWeight: "700" },
});
