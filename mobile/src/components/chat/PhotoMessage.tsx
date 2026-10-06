import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from "react-native";
import type { PhotoInfo } from "../../lib/api";
import { fmt, t } from "../../lib/strings";
import { colors, fonts, motion, radii, space, withAlpha, type PersonaGradient } from "../../lib/theme";
import { AppText } from "../AppText";
import { PressableScale } from "../PressableScale";
import { chatCopy } from "./copy";

export type PhotoMessageProps = {
  photo: PhotoInfo;
  gradient: PersonaGradient;
  unlocking: boolean;
  /** Locked photos are never auto-charged — this only fires on an explicit tap. */
  onUnlock: () => void;
  onOpen: (url: string) => void;
};

const W = 220;
const H = 280;

export function PhotoMessage({ photo, gradient, unlocking, onUnlock, onOpen }: PhotoMessageProps) {
  if (photo.locked || !photo.url) {
    return <LockedPhoto photo={photo} gradient={gradient} unlocking={unlocking} onUnlock={onUnlock} />;
  }
  return <RevealedPhoto url={photo.url} caption={photo.caption} onOpen={onOpen} />;
}

function LockedPhoto({
  photo,
  gradient,
  unlocking,
  onUnlock,
}: Pick<PhotoMessageProps, "photo" | "gradient" | "unlocking" | "onUnlock">) {
  return (
    <PressableScale
      onPress={onUnlock}
      disabled={unlocking}
      haptics
      accessibilityRole="button"
      accessibilityLabel={fmt(t.chat.unlock, { cost: photo.cost })}
      accessibilityHint={photo.caption}
    >
      <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={styles.locked}>
        {/* soft "frosted" shapes so the card reads as a hidden photo, not a flat block */}
        <View style={[styles.blob, styles.blobA]} />
        <View style={[styles.blob, styles.blobB]} />
        <LinearGradient
          colors={["rgba(15,10,18,0)", "rgba(15,10,18,0.55)"]}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={12} color="#fff" />
        </View>

        <View style={styles.lockedBody}>
          <View style={styles.cameraRing}>
            <Ionicons name="camera" size={30} color="#fff" />
          </View>
          <AppText variant="overline" style={styles.lockedTitle} align="center">
            {chatCopy.photoLockedTitle}
          </AppText>
          <AppText variant="bodyStrong" style={styles.caption} align="center" numberOfLines={3}>
            {fmt(chatCopy.photoCaption, { caption: photo.caption })}
          </AppText>
        </View>

        <View style={styles.unlockPill}>
          {unlocking ? (
            <>
              <ActivityIndicator size="small" color={colors.accentText} />
              <AppText variant="caption" color="accentText">
                {chatCopy.unlocking}
              </AppText>
            </>
          ) : (
            <>
              <Ionicons name="eye" size={16} color={colors.textOnAccent} />
              <AppText variant="caption" style={styles.unlockText}>
                {fmt(t.chat.unlock, { cost: photo.cost })}
              </AppText>
            </>
          )}
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

function RevealedPhoto({ url, caption, onOpen }: { url: string; caption: string; onOpen: (url: string) => void }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const onLoad = () =>
    Animated.timing(reveal, { toValue: 1, duration: motion.hero, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={() => onOpen(url)}
      accessibilityRole="imagebutton"
      accessibilityLabel={chatCopy.openPhoto}
      accessibilityHint={caption}
    >
      <View style={styles.photoFrame}>
        <Animated.View
          style={{
            opacity: reveal,
            transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) }],
          }}
        >
          <Image
            source={{ uri: url }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoad={onLoad}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
        <View style={styles.expand}>
          <MaterialCommunityIcons name="arrow-expand" size={14} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  locked: {
    width: W,
    height: H,
    borderRadius: radii.md + 2,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: space.lg,
  },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)" },
  blobA: { width: 180, height: 180, top: -50, left: -60 },
  blobB: { width: 140, height: 140, bottom: 30, right: -50, backgroundColor: "rgba(255,255,255,0.10)" },
  lockBadge: {
    position: "absolute",
    top: space.md,
    right: space.md,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(15,10,18,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm, paddingTop: space.lg },
  cameraRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  lockedTitle: { color: "rgba(255,255,255,0.85)" },
  caption: { color: "#fff", fontFamily: fonts.bodySemi },
  unlockPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs + 2,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: withAlpha("#FFFFFF", 0.35),
  },
  unlockText: { color: colors.textOnAccent, fontFamily: fonts.bodyBold, fontSize: 14 },
  photoFrame: {
    width: W,
    height: H,
    borderRadius: radii.md + 2,
    overflow: "hidden",
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: { width: W, height: H },
  expand: {
    position: "absolute",
    right: space.sm,
    bottom: space.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(15,10,18,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});
