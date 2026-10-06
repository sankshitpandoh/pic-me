import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, motion, radii, space } from "../lib/theme";
import { AppText } from "./AppText";

export type BottomSheetProps = {
  visible: boolean;
  /** Called on backdrop tap and Android back. Set `visible` to false in response. */
  onClose: () => void;
  children: ReactNode;
  /** Optional title (title2) under the grab handle. */
  title?: string;
};

/**
 * Modal bottom sheet: dimmed backdrop (tap to close), slide-up surface with rounded top corners,
 * grab handle and safe-area bottom padding. Content sizes the sheet (wrap long content in a ScrollView).
 */
export function BottomSheet({ visible, onClose, children, title }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const offscreen = Dimensions.get("window").height;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: motion.slow, useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(progress, { toValue: 0, duration: motion.base, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [offscreen, 0] });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) + space.sm, transform: [{ translateY }] }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          {title ? (
            <AppText variant="title2" style={styles.title}>
              {title}
            </AppText>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.gutter,
    paddingTop: space.sm,
    maxHeight: "90%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: space.md,
  },
  title: { marginBottom: space.md },
});
