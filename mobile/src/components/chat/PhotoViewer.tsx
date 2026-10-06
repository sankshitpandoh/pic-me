import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "../../lib/theme";
import { chatCopy } from "./copy";

/** Full-screen photo viewer: dark overlay, tap anywhere outside / close button to dismiss. */
export function PhotoViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={url !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={chatCopy.closeViewer} />
        {url ? (
          <View style={styles.frame} pointerEvents="none">
            <Image source={{ uri: url }} style={styles.image} contentFit="contain" transition={200} />
          </View>
        ) : null}
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={chatCopy.closeViewer}
          style={[styles.close, { top: insets.top + space.md }]}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(5,3,7,0.94)", justifyContent: "center" },
  frame: { width: "100%", height: "78%", paddingHorizontal: space.md },
  image: { width: "100%", height: "100%", borderRadius: 16 },
  close: {
    position: "absolute",
    right: space.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
});
