import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { t } from "../lib/strings";
import { colors, radii, space } from "../lib/theme";
import { AppText } from "./AppText";
import { GradientButton } from "./GradientButton";

export type ScreenStateProps = (
  | {
      /** Pulsing skeleton rows (avatar + two lines). */
      variant: "loading";
      /** Number of skeleton rows. Default 5. */
      rows?: number;
    }
  | {
      /** Icon + message + "Phir se try karo" button. Pass `errorMessage(err)` as message. */
      variant: "error";
      message?: string;
      onRetry?: () => void;
    }
  | {
      /** Emoji + text + optional CTA. */
      variant: "empty";
      emoji?: string;
      title?: string;
      message: string;
      ctaLabel?: string;
      onCta?: () => void;
    }
) & { style?: StyleProp<ViewStyle> };

/** Full-area loading / error / empty placeholder. Fills its parent (flex: 1). */
export function ScreenState(props: ScreenStateProps) {
  if (props.variant === "loading") return <Skeleton rows={props.rows ?? 5} style={props.style} />;

  if (props.variant === "error") {
    return (
      <View style={[styles.center, props.style]}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        </View>
        <AppText variant="bodyLg" color="textSecondary" align="center">
          {props.message ?? t.errors.generic}
        </AppText>
        {props.onRetry ? (
          <GradientButton title={t.common.retry} onPress={props.onRetry} size="md" style={styles.cta} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.center, props.style]}>
      {props.emoji ? <AppText style={styles.emoji}>{props.emoji}</AppText> : null}
      {props.title ? (
        <AppText variant="title2" align="center">
          {props.title}
        </AppText>
      ) : null}
      <AppText variant="bodyLg" color="textSecondary" align="center">
        {props.message}
      </AppText>
      {props.ctaLabel && props.onCta ? (
        <GradientButton title={props.ctaLabel} onPress={props.onCta} size="md" style={styles.cta} />
      ) : null}
    </View>
  );
}

function Skeleton({ rows, style }: { rows: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.skeleton, { opacity: pulse }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={t.common.loading}
    >
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skRow}>
          <View style={styles.skAvatar} />
          <View style={styles.skLines}>
            <View style={[styles.skLine, { width: "45%" }]} />
            <View style={[styles.skLine, { width: i % 2 ? "70%" : "85%", height: 10 }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xxxl, gap: space.md },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  emoji: { fontSize: 48, lineHeight: 58 },
  cta: { marginTop: space.md, alignSelf: "center" },
  skeleton: { flex: 1, paddingHorizontal: space.gutter, paddingTop: space.lg, gap: space.xl },
  skRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  skAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.elevated2 },
  skLines: { flex: 1, gap: space.sm },
  skLine: { height: 14, borderRadius: radii.xs, backgroundColor: colors.elevated2 },
});
